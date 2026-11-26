import { beforeEach, describe, expect, it, vi } from 'vitest';
import { faker } from '@faker-js/faker';

const { invokeMock, logErrorMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

vi.mock('@tauri-apps/plugin-log', () => ({ error: logErrorMock }));

import apiRag, {
  ApiError,
  getAccessSettings,
  normalizeNativeError,
  saveAccessSettings,
  updateApiKey,
  updateServerHost,
  validateSavedAccess,
} from '@/lib/axios';
import { logFrontendFailure, openLogsFolder } from '@/lib/errorLogging';

describe('native API client', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    logErrorMock.mockReset();
  });

  it('sends typed JSON requests through Tauri without exposing credentials', async () => {
    // 1. ARRANGE
    const responseBody = { id: faker.string.uuid() };
    invokeMock.mockResolvedValueOnce({ status: 200, body: responseBody });

    // 2. ACT
    const response = await apiRag.get<typeof responseBody>('/workspace/list');

    // 3. ASSERT
    expect(response.data).toEqual(responseBody);
    expect(invokeMock).toHaveBeenCalledWith('api_request', {
      request: { method: 'GET', path: 'workspace/list', body: undefined },
    });
  });

  it('sends JSON PATCH requests through the native API command', async () => {
    // 1. ARRANGE
    const update = { ocr: faker.system.fileName() };
    const responseBody = { ...update, editable_roles: ['ocr'] };
    invokeMock.mockResolvedValueOnce({ status: 200, body: responseBody });

    // 2. ACT
    const response = await apiRag.patch<typeof responseBody>(
      '/ollama/preferences',
      update,
    );

    // 3. ASSERT
    expect(response.data).toEqual(responseBody);
    expect(invokeMock).toHaveBeenCalledWith('api_request', {
      request: {
        method: 'PATCH',
        path: 'ollama/preferences',
        body: update,
      },
    });
  });

  it('keeps multipart document replacement on the upload command', async () => {
    // 1. ARRANGE
    const documentId = faker.string.uuid();
    const file = new File([faker.lorem.sentence()], faker.system.fileName(), {
      type: 'application/pdf',
    });
    const formData = new FormData();
    formData.set('file', file);
    const responseBody = { document_id: documentId };
    invokeMock.mockResolvedValueOnce({ status: 200, body: responseBody });

    // 2. ACT
    const response = await apiRag.patch<typeof responseBody>(
      `/documents/${documentId}`,
      formData,
    );

    // 3. ASSERT
    expect(response.data).toEqual(responseBody);
    expect(invokeMock).toHaveBeenCalledWith(
      'upload_document',
      expect.any(Uint8Array),
      { headers: { 'x-upload-metadata': expect.any(String) } },
    );
  });

  it('sends chat job requests through the native command with the idempotency key', async () => {
    // 1. ARRANGE
    const key = faker.string.uuid();
    const body = {
      workspace_id: faker.string.uuid(),
      message: faker.lorem.sentence(),
    };
    const job = { id: faker.string.uuid(), status: 'queued' };
    invokeMock.mockResolvedValueOnce({ status: 202, body: job, retryAfter: null });

    // 2. ACT
    const response = await apiRag.chatJob<typeof job>('POST', '/chat/jobs', key, body);

    // 3. ASSERT
    expect(response).toEqual({ status: 202, data: job, retryAfter: null });
    expect(invokeMock).toHaveBeenCalledWith('chat_job_request', {
      request: { method: 'POST', path: 'chat/jobs', body },
      idempotencyKey: key,
    });
  });

  it('returns a full-queue response and its Retry-After value for caller retries', async () => {
    // 1. ARRANGE
    const key = faker.string.uuid();
    const retryAfter = '5';
    const queueResponse = { detail: faker.lorem.sentence() };
    invokeMock.mockResolvedValueOnce({ status: 503, body: queueResponse, retryAfter });

    // 2. ACT
    const response = await apiRag.chatJob<typeof queueResponse>(
      'POST',
      '/chat/jobs',
      key,
      { workspace_id: faker.string.uuid(), message: faker.lorem.sentence() },
    );

    // 3. ASSERT
    expect(response).toMatchObject({ status: 503, data: queueResponse, retryAfter });
  });

  it('maps native non-success responses to an API error with response data', async () => {
    // 1. ARRANGE
    const details = faker.lorem.sentence();
    invokeMock.mockResolvedValueOnce({
      status: 401,
      body: { detail: details },
    });

    // 2. ACT
    const request = apiRag.get('workspace/list');

    // 3. ASSERT
    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      response: { status: 401, data: { detail: details } },
    });
  });

  it('downloads binary API responses through the native binary command', async () => {
    // 1. ARRANGE
    const bytes = new Uint8Array([37, 80, 68, 70, 45]);
    invokeMock.mockResolvedValueOnce(bytes);

    // 2. ACT
    const response = await apiRag.getBinary('/documents/document-id/pdf');

    // 3. ASSERT
    expect(response.data).toBe(bytes);
    expect(invokeMock).toHaveBeenCalledWith('api_binary_request', {
      request: {
        method: 'GET',
        path: 'documents/document-id/pdf',
        body: undefined,
      },
    });
  });

  it('normalizes binary command failures for the document hook', async () => {
    // 1. ARRANGE
    const nativeMessage = faker.lorem.sentence();
    invokeMock.mockRejectedValueOnce(nativeMessage);

    // 2. ACT
    const request = apiRag.getBinary('/documents/document-id/pdf');

    // 3. ASSERT
    await expect(request).rejects.toThrow(nativeMessage);
  });

  it('logs an HTTP request failure without writing response details or query data', async () => {
    // 1. ARRANGE
    const secret = faker.string.alphanumeric({ length: 32 });
    const privateDetail = `request rejected ${secret}`;
    invokeMock.mockResolvedValueOnce({
      status: 403,
      body: { detail: privateDetail, api_key: secret },
    });

    // 2. ACT
    const request = apiRag.get(`/workspace/list?api_key=${secret}`);
    await expect(request).rejects.toBeInstanceOf(ApiError);

    // 3. ASSERT
    expect(logErrorMock).toHaveBeenCalledTimes(1);
    const loggedEntry = String(logErrorMock.mock.calls[0]?.[0]);
    expect(loggedEntry).toContain('"stage":"request"');
    expect(loggedEntry).toContain('"method":"GET"');
    expect(loggedEntry).toContain('"path":"/workspace/list"');
    expect(loggedEntry).toContain('"status":403');
    expect(loggedEntry).toContain('"reason":"http"');
    expect(loggedEntry).not.toContain(secret);
    expect(loggedEntry).not.toContain(privateDetail);
  });

  it('preserves binary HTTP status and logs only safe download fields', async () => {
    // 1. ARRANGE
    const documentId = faker.string.uuid();
    const secret = faker.string.alphanumeric({ length: 32 });
    invokeMock.mockRejectedValueOnce({
      status: 404,
      reason: 'http',
      message: `not found ${secret}`,
    });

    // 2. ACT
    const request = apiRag.getBinary(`/documents/${documentId}/pdf?key=${secret}`);
    await expect(request).rejects.toMatchObject({ status: 404, reason: 'http' });

    // 3. ASSERT
    expect(logErrorMock).toHaveBeenCalledTimes(1);
    const loggedEntry = String(logErrorMock.mock.calls[0]?.[0]);
    expect(loggedEntry).toContain('"stage":"download"');
    expect(loggedEntry).toContain('"path":"/documents/:id/pdf"');
    expect(loggedEntry).toContain('"status":404');
    expect(loggedEntry).toContain('"reason":"http"');
    expect(loggedEntry).not.toContain(secret);
    expect(loggedEntry).not.toContain(documentId);
  });

  it('logs a binary network failure without an HTTP status', async () => {
    // 1. ARRANGE
    invokeMock.mockRejectedValueOnce('Unable to reach the RAG API');

    // 2. ACT
    const request = apiRag.getBinary('/documents/document-id/images');
    await expect(request).rejects.toThrow('Unable to reach the RAG API');

    // 3. ASSERT
    expect(logErrorMock).toHaveBeenCalledTimes(1);
    expect(String(logErrorMock.mock.calls[0]?.[0])).toContain('"status":null');
    expect(String(logErrorMock.mock.calls[0]?.[0])).toContain('"reason":"network"');
  });

  it('logs an invalid binary response with its successful HTTP status', async () => {
    // 1. ARRANGE
    invokeMock.mockRejectedValueOnce({
      status: 200,
      reason: 'invalid_response',
      message: 'The downloaded file is not a valid PDF',
    });

    // 2. ACT
    const request = apiRag.getBinary('/documents/document-id/pdf');
    await expect(request).rejects.toMatchObject({
      status: 200,
      reason: 'invalid_response',
    });

    // 3. ASSERT
    const loggedEntry = String(logErrorMock.mock.calls[0]?.[0]);
    expect(loggedEntry).toContain('"stage":"download"');
    expect(loggedEntry).toContain('"status":200');
    expect(loggedEntry).toContain('"reason":"invalid_response"');
    expect(loggedEntry).not.toContain('valid PDF');
  });

  it('does not let a local log write failure affect application behavior', async () => {
    // 1. ARRANGE
    logErrorMock.mockRejectedValueOnce(new Error(faker.lorem.sentence()));

    // 2. ACT
    const logging = logFrontendFailure({
      stage: 'request',
      method: 'GET',
      path: '/workspace/list',
      status: null,
      reason: 'network',
    });

    // 3. ASSERT
    await expect(logging).resolves.toBeUndefined();
  });

  it('opens the log directory through the dedicated native command', async () => {
    // 1. ARRANGE
    invokeMock.mockResolvedValueOnce(undefined);

    // 2. ACT
    await openLogsFolder();

    // 3. ASSERT
    expect(invokeMock).toHaveBeenCalledWith('open_logs_folder');
  });

  it('normalizes Tauri string and object rejections without exposing extra data', () => {
    // 1. ARRANGE
    const nativeMessage = faker.lorem.sentence();

    // 2. ACT
    const stringError = normalizeNativeError(nativeMessage, faker.lorem.sentence());
    const objectError = normalizeNativeError(
      { code: faker.word.noun(), message: nativeMessage },
      faker.lorem.sentence(),
    );

    // 3. ASSERT
    expect(stringError).toEqual(new Error(nativeMessage));
    expect(objectError).toEqual(new Error(nativeMessage));
  });

  it('preserves the native access error when Tauri rejects with a string', async () => {
    // 1. ARRANGE
    const nativeMessage = faker.lorem.sentence();
    invokeMock.mockRejectedValueOnce(nativeMessage);

    // 2. ACT
    const request = updateApiKey(faker.string.alphanumeric({ length: 32 }));

    // 3. ASSERT
    await expect(request).rejects.toThrow(nativeMessage);
  });

  it('logs saved-access validation failures without writing credential errors', async () => {
    // 1. ARRANGE
    const secret = faker.string.alphanumeric({ length: 32 });
    invokeMock.mockRejectedValueOnce({
      code: 'rejected',
      status: 403,
      message: `credential rejected ${secret}`,
    });

    // 2. ACT
    await expect(validateSavedAccess()).rejects.toThrow(`credential rejected ${secret}`);

    // 3. ASSERT
    expect(logErrorMock).toHaveBeenCalledTimes(1);
    const loggedEntry = String(logErrorMock.mock.calls[0]?.[0]);
    expect(loggedEntry).toContain('"stage":"request"');
    expect(loggedEntry).toContain('"path":"/workspace/list"');
    expect(loggedEntry).toContain('"status":403');
    expect(loggedEntry).toContain('"reason":"http"');
    expect(loggedEntry).not.toContain(secret);
  });

  it('uses write-only native commands for API access settings', async () => {
    // 1. ARRANGE
    const apiKey = faker.string.alphanumeric({ length: 32 });
    const serverHost = `${faker.internet.url().replace(/\/$/, '')}/api/v1`;
    invokeMock
      .mockResolvedValueOnce({ configured: true, serverHost })
      .mockResolvedValueOnce({ configured: true, serverHost })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(serverHost)
      .mockResolvedValueOnce(undefined);

    // 2. ACT
    const status = await getAccessSettings();
    await saveAccessSettings(apiKey, serverHost);
    await updateApiKey(apiKey);
    await updateServerHost(serverHost);
    await validateSavedAccess();

    // 3. ASSERT
    expect(status).toEqual({ configured: true, serverHost });
    expect(invokeMock).toHaveBeenNthCalledWith(1, 'get_access_settings');
    expect(invokeMock).toHaveBeenNthCalledWith(
      2,
      'validate_and_save_access_settings',
      { apiKey, serverHost },
    );
    expect(invokeMock).toHaveBeenNthCalledWith(3, 'validate_and_save_api_key', {
      apiKey,
    });
    expect(invokeMock).toHaveBeenNthCalledWith(
      4,
      'validate_and_save_server_host',
      { serverHost },
    );
    expect(invokeMock).toHaveBeenNthCalledWith(5, 'validate_saved_access');
  });
});

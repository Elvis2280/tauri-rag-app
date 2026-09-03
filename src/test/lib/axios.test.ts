import { describe, expect, it, vi } from 'vitest';
import { faker } from '@faker-js/faker';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({
  Channel: class {
    onmessage: ((event: unknown) => void) | null = null;
  },
  invoke: invokeMock,
}));

import apiRag, {
  ApiError,
  normalizeNativeError,
  saveCredential,
} from '@/lib/axios';

describe('native API client', () => {
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

  it('preserves the native credential error when Tauri rejects with a string', async () => {
    // 1. ARRANGE
    const nativeMessage = faker.lorem.sentence();
    invokeMock.mockRejectedValueOnce(nativeMessage);

    // 2. ACT
    const request = saveCredential(faker.string.alphanumeric({ length: 32 }));

    // 3. ASSERT
    await expect(request).rejects.toThrow(nativeMessage);
  });
});

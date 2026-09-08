import { faker } from "@faker-js/faker";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApiAccess } from "@/hooks/useApiAccess";
import {
  getAccessSettings,
  saveAccessSettings,
  updateApiKey,
  updateServerHost,
} from "@/lib/axios";

vi.mock("@/lib/axios", () => ({
  getAccessSettings: vi.fn(),
  normalizeNativeError: (error: unknown, fallback: string) =>
    error instanceof Error ? error : new Error(fallback),
  saveAccessSettings: vi.fn(),
  updateApiKey: vi.fn(),
  updateServerHost: vi.fn(),
}));

const mockedGetAccessSettings = vi.mocked(getAccessSettings);
const mockedSaveAccessSettings = vi.mocked(saveAccessSettings);
const mockedUpdateApiKey = vi.mocked(updateApiKey);
const mockedUpdateServerHost = vi.mocked(updateServerHost);

describe("useApiAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the configured status without retrieving the API key", async () => {
    // 1. ARRANGE
    const serverHost = faker.internet.url().replace(/\/$/, "");
    mockedGetAccessSettings.mockResolvedValue({ configured: true, serverHost });

    // 2. ACT
    const { result } = renderHook(() => useApiAccess());

    // 3. ASSERT
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.configured).toBe(true);
    expect(result.current.serverHost).toBe(serverHost);
    expect(Object.keys(result.current)).not.toContain("apiKey");
  });

  it("stores initial access settings and adopts the canonical host", async () => {
    // 1. ARRANGE
    const apiKey = faker.string.alphanumeric({ length: 32 });
    const enteredHost = `${faker.internet.ipv4()}:${faker.internet.port()}`;
    const canonicalHost = `http://${enteredHost}`;
    mockedGetAccessSettings.mockResolvedValue({
      configured: false,
      serverHost: faker.internet.url().replace(/\/$/, ""),
    });
    mockedSaveAccessSettings.mockResolvedValue({
      configured: true,
      serverHost: canonicalHost,
    });
    const { result } = renderHook(() => useApiAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 2. ACT
    await act(async () => {
      await result.current.setup(apiKey, enteredHost);
    });

    // 3. ASSERT
    expect(mockedSaveAccessSettings).toHaveBeenCalledWith(apiKey, enteredHost);
    expect(result.current.configured).toBe(true);
    expect(result.current.serverHost).toBe(canonicalHost);
  });

  it("updates key and host through separate native operations", async () => {
    // 1. ARRANGE
    const apiKey = faker.string.alphanumeric({ length: 32 });
    const originalHost = faker.internet.url().replace(/\/$/, "");
    const enteredHost = `${faker.internet.ipv4()}:${faker.internet.port()}`;
    const canonicalHost = `http://${enteredHost}`;
    mockedGetAccessSettings.mockResolvedValue({
      configured: true,
      serverHost: originalHost,
    });
    mockedUpdateApiKey.mockResolvedValue(undefined);
    mockedUpdateServerHost.mockResolvedValue(canonicalHost);
    const { result } = renderHook(() => useApiAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 2. ACT
    await act(async () => {
      await result.current.saveApiKey(apiKey);
      await result.current.saveServerHost(enteredHost);
    });

    // 3. ASSERT
    expect(mockedUpdateApiKey).toHaveBeenCalledWith(apiKey);
    expect(mockedUpdateServerHost).toHaveBeenCalledWith(enteredHost);
    expect(result.current.serverHost).toBe(canonicalHost);
  });
});

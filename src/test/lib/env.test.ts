import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import {
  buildWebSocketUrl,
  normalizeBaseUrl,
} from "@/lib/env";

describe("environment URL helpers", () => {
  it("removes trailing slashes from a configured base URL", () => {
    // 1. ARRANGE
    const baseUrl = faker.internet.url().replace(/\/+$/, "");
    const configuredUrl = `${baseUrl}///`;

    // 2. ACT
    const normalizedUrl = normalizeBaseUrl(configuredUrl, faker.internet.url());

    // 3. ASSERT
    expect(normalizedUrl).toBe(baseUrl);
  });

  it("uses the fallback when the configured URL is empty", () => {
    // 1. ARRANGE
    const fallbackUrl = faker.internet.url();

    // 2. ACT
    const normalizedUrl = normalizeBaseUrl("   ", fallbackUrl);

    // 3. ASSERT
    expect(normalizedUrl).toBe(fallbackUrl.replace(/\/+$/, ""));
  });

  it("builds a WebSocket URL without duplicate slashes", () => {
    // 1. ARRANGE
    const path = "documents/status";

    // 2. ACT
    const websocketUrl = buildWebSocketUrl(`/${path}`);

    // 3. ASSERT
    expect(websocketUrl).toMatch(new RegExp(`/${path}$`));
  });
});

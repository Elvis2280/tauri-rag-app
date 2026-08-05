import { describe, it, expect } from "vitest";
import { cn } from "../lib/utils";

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    // 1. ARRANGE
    const inputs = ["px-2", "px-4", "bg-red-500"];

    // 2. ACT
    const result = cn(...inputs);

    // 3. ASSERT
    expect(result).toBe("px-4 bg-red-500");
  });
});

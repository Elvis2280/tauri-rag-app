import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "@/components/chat/EmptyState";

describe("EmptyState", () => {
  it("renders the sparkle icon with the neon sunlight glow", () => {
    // 1. ARRANGE
    render(<EmptyState />);

    // 2. ACT
    const title = screen.getByRole("heading", { name: "RAG Chat" });
    const glow = title.previousElementSibling;

    // 3. ASSERT
    expect(glow).toHaveClass("neon-sun-glow");
  });
});

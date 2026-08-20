import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import Layout from "@/components/common/Layout";

vi.mock("@/hooks/useHistoryWebsocket", () => ({
  useHistoryWebsocket: vi.fn(),
}));
vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

describe("Layout", () => {
  it("renders the RAG UI title with the primary text glow", () => {
    // 1. ARRANGE
    render(
      <MemoryRouter initialEntries={["/chat"]}>
        <Routes>
          <Route path="*" element={<Layout />} />
        </Routes>
      </MemoryRouter>,
    );

    // 2. ACT
    const title = screen.getByRole("heading", { name: "RAG UI" });

    // 3. ASSERT
    expect(title).toHaveClass("neon-text-glow", "text-primary");
  });
});

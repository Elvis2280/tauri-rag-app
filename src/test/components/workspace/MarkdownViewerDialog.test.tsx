import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { faker } from "@faker-js/faker";
import { describe, expect, it, vi } from "vitest";
import MarkdownViewerDialog, {
  type LoadedMarkdown,
} from "@/components/workspace/MarkdownViewerDialog";

function buildLoadedMarkdown(overrides?: Partial<LoadedMarkdown>): LoadedMarkdown {
  return {
    fileId: faker.string.uuid(),
    name: faker.system.commonFileName("md"),
    content: faker.lorem.paragraph(),
    ...overrides,
  };
}

describe("MarkdownViewerDialog", () => {
  it("renders GitHub Flavored Markdown content", () => {
    // 1. ARRANGE
    const heading = faker.lorem.words();
    const cell = faker.lorem.word();
    const task = faker.lorem.words();
    const struck = faker.lorem.word();
    const markdown = buildLoadedMarkdown({
      content: [
        `# ${heading}`,
        "",
        `| ${cell} | ${faker.lorem.word()} |`,
        "| --- | --- |",
        `| ${faker.lorem.word()} | ${faker.lorem.word()} |`,
        "",
        `- [x] ${task}`,
        "",
        `~~${struck}~~`,
      ].join("\n"),
    });

    // 2. ACT
    render(
      <MarkdownViewerDialog
        open
        requestedName={markdown.name}
        markdown={markdown}
        isLoading={false}
        hasLoadError={false}
        onOpenChange={vi.fn()}
      />,
    );

    // 3. ASSERT
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByText(struck).closest("del")).toBeInTheDocument();
  });

  it("shows a loading status before content arrives", () => {
    // 1. ARRANGE
    const requestedName = faker.system.commonFileName("markdown");

    // 2. ACT
    render(
      <MarkdownViewerDialog
        open
        requestedName={requestedName}
        markdown={null}
        isLoading
        hasLoadError={false}
        onOpenChange={vi.fn()}
      />,
    );

    // 3. ASSERT
    expect(screen.getByText("Loading Markdown…")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent(requestedName);
  });

  it("shows an error when the Markdown request fails", () => {
    // 1. ARRANGE
    const requestedName = faker.system.commonFileName("markdown");

    // 2. ACT
    render(
      <MarkdownViewerDialog
        open
        requestedName={requestedName}
        markdown={null}
        isLoading={false}
        hasLoadError
        onOpenChange={vi.fn()}
      />,
    );

    // 3. ASSERT
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to display this Markdown file.",
    );
  });

  it("closes from the X button", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const markdown = buildLoadedMarkdown();
    render(
      <MarkdownViewerDialog
        open
        requestedName={markdown.name}
        markdown={markdown}
        isLoading={false}
        hasLoadError={false}
        onOpenChange={onOpenChange}
      />,
    );

    // 2. ACT
    await user.click(
      screen.getByRole("button", { name: "Close Markdown preview" }),
    );

    // 3. ASSERT
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows the last content with a request error after a replacement fails", () => {
    // 1. ARRANGE
    const markdown = buildLoadedMarkdown();

    // 2. ACT
    render(
      <MarkdownViewerDialog
        open
        requestedName={faker.system.commonFileName("md")}
        markdown={markdown}
        isLoading={false}
        hasLoadError
        onOpenChange={vi.fn()}
      />,
    );

    // 3. ASSERT
    expect(screen.getByRole("dialog")).toHaveTextContent(markdown.name);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to display this Markdown file.",
    );
  });
});

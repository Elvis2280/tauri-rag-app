import { faker } from "@faker-js/faker";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ApiAccessModal from "@/components/auth/ApiAccessModal";
import { API_ACCESS_MASK } from "@/constants/apiAccess";

function buildProps() {
  return {
    open: true,
    serverHost: faker.internet.url().replace(/\/$/, ""),
    onOpenChange: vi.fn(),
    onCancelRequired: vi.fn(),
    onSetup: vi.fn().mockResolvedValue(undefined),
    onUpdateApiKey: vi.fn().mockResolvedValue(undefined),
    onUpdateServerHost: vi.fn().mockResolvedValue(undefined),
  };
}

describe("ApiAccessModal", () => {
  it("shows a fixed masked key and the current host without exposing a secret", () => {
    // 1. ARRANGE
    const props = buildProps();

    // 2. ACT
    render(<ApiAccessModal {...props} />);

    // 3. ASSERT
    expect(screen.getByLabelText("API key")).toHaveValue(API_ACCESS_MASK);
    expect(screen.getByLabelText("API key")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Server Host")).toHaveValue(props.serverHost);
  });

  it("clears, masks, and saves a replacement API key", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const apiKey = faker.string.alphanumeric({ length: 40 });
    render(<ApiAccessModal {...props} />);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Update API key" }));
    const input = screen.getByLabelText("API key");
    await user.type(input, apiKey);
    await user.click(screen.getByRole("button", { name: "Save" }));

    // 3. ASSERT
    expect(input).toHaveAttribute("type", "password");
    expect(props.onUpdateApiKey).toHaveBeenCalledWith(apiKey);
    expect(screen.getByLabelText("API key")).toHaveValue(API_ACCESS_MASK);
  });

  it("discards a server-host draft when its row is cancelled", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const draftHost = `${faker.internet.ipv4()}:${faker.internet.port()}`;
    render(<ApiAccessModal {...props} />);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Update Server Host" }));
    await user.type(screen.getByLabelText("Server Host"), draftHost);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // 3. ASSERT
    expect(props.onUpdateServerHost).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Server Host")).toHaveValue(props.serverHost);
  });

  it("clears and saves a replacement server host", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const serverHost = `${faker.internet.ipv4()}:${faker.internet.port()}`;
    render(<ApiAccessModal {...props} />);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Update Server Host" }));
    const input = screen.getByLabelText("Server Host");
    expect(input).toHaveValue("");
    await user.type(input, serverHost);
    await user.click(screen.getByRole("button", { name: "Save" }));

    // 3. ASSERT
    expect(props.onUpdateServerHost).toHaveBeenCalledWith(serverHost);
  });

  it("validates and saves the key and host together during required setup", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const apiKey = faker.string.alphanumeric({ length: 32 });
    const serverHost = `${faker.internet.ipv4()}:${faker.internet.port()}`;
    render(<ApiAccessModal {...props} required serverHost="" />);

    // 2. ACT
    await user.type(screen.getByLabelText("API key"), apiKey);
    await user.type(screen.getByLabelText("Server Host"), serverHost);
    await user.click(screen.getByRole("button", { name: "Save" }));

    // 3. ASSERT
    expect(props.onSetup).toHaveBeenCalledWith(apiKey, serverHost);
  });

  it("keeps the edit open and reports a rejected update", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const apiKey = faker.string.alphanumeric({ length: 32 });
    const message = faker.lorem.sentence();
    props.onUpdateApiKey.mockRejectedValueOnce(new Error(message));
    render(<ApiAccessModal {...props} />);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Update API key" }));
    await user.type(screen.getByLabelText("API key"), apiKey);
    await user.click(screen.getByRole("button", { name: "Save" }));

    // 3. ASSERT
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("API key")).toHaveValue(apiKey);
  });

  it("discards configured edits when the modal is closed", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const apiKey = faker.string.alphanumeric({ length: 32 });
    const { rerender } = render(<ApiAccessModal {...props} />);
    await user.click(screen.getByRole("button", { name: "Update API key" }));
    await user.type(screen.getByLabelText("API key"), apiKey);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Close" }));
    rerender(<ApiAccessModal {...props} open={false} />);
    rerender(<ApiAccessModal {...props} open />);

    // 3. ASSERT
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByLabelText("API key")).toHaveValue(API_ACCESS_MASK);
    expect(props.onUpdateApiKey).not.toHaveBeenCalled();
  });
});

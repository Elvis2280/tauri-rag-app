import { faker } from "@faker-js/faker";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as renderUi, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConfigurationModal from "@/components/configuration/ConfigurationModal";
import { API_ACCESS_MASK } from "@/constants/apiAccess";
import { CONFIGURATION_LABELS } from "@/constants/configuration";
import { OLLAMA_ENDPOINTS } from "@/constants/ollama";

const { openLogsFolderMock, toastErrorMock, apiGetMock } = vi.hoisted(() => ({
  openLogsFolderMock: vi.fn(),
  toastErrorMock: vi.fn(),
  apiGetMock: vi.fn(),
}));

vi.mock("@/lib/errorLogging", () => ({
  openLogsFolder: openLogsFolderMock,
}));
vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));
vi.mock("@/lib/axios", () => ({
  default: { get: apiGetMock, patch: vi.fn() },
}));

function render(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderUi(node, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

function buildProps() {
  return {
    open: true,
    serverHost: `${faker.internet.url().replace(/\/$/, "")}/api/v1`,
    onOpenChange: vi.fn(),
    onCancelRequired: vi.fn(),
    onSetup: vi.fn().mockResolvedValue(undefined),
    onUpdateApiKey: vi.fn().mockResolvedValue(undefined),
    onUpdateServerHost: vi.fn().mockResolvedValue(undefined),
    onValidateAndClose: vi.fn().mockResolvedValue(undefined),
  };
}

describe("ConfigurationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockImplementation(async (path: string) => ({
      data: path.includes("/status")
        ? { is_reachable: true, available_models: [], models: [] }
        : { editable_roles: [] },
    }));
  });

  it("shows a fixed masked key and the current host without exposing a secret", () => {
    // 1. ARRANGE
    const props = buildProps();

    // 2. ACT
    render(<ConfigurationModal {...props} />);

    // 3. ASSERT
    expect(screen.getByLabelText("API key")).toHaveValue(API_ACCESS_MASK);
    expect(screen.getByLabelText("API key")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Server Host")).toHaveValue(props.serverHost);
    expect(
      screen.getByText(/hosts without a scheme use HTTPS\/WSS/i),
    ).toBeInTheDocument();
  });

  it("shows the configuration categories in order", () => {
    // 1. ARRANGE
    const props = buildProps();

    // 2. ACT
    render(<ConfigurationModal {...props} />);

    // 3. ASSERT
    expect(
      screen.getAllByRole("heading").map((heading) => heading.textContent),
    ).toEqual([
      CONFIGURATION_LABELS.title,
      CONFIGURATION_LABELS.connectionCategory,
      CONFIGURATION_LABELS.llmModelsCategory,
      CONFIGURATION_LABELS.logsCategory,
    ]);
  });

  it("keeps Configuration open when a model is selected", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const currentModel = `${faker.word.noun()}:${faker.string.alphanumeric(4)}`;
    const nextModel = `${faker.word.noun()}:${faker.string.alphanumeric(4)}`;
    apiGetMock.mockImplementation(async (path: string) => ({
      data:
        path === OLLAMA_ENDPOINTS.status
          ? {
              is_reachable: true,
              available_models: [currentModel, nextModel],
              models: [
                { name: currentModel, eligible_roles: ["ocr"] },
                { name: nextModel, eligible_roles: ["ocr"] },
              ],
            }
          : { ocr: currentModel, editable_roles: ["ocr"] },
    }));
    render(<ConfigurationModal {...props} />);
    const modelSelect = await screen.findByRole("combobox", { name: "OCR" });

    // 2. ACT
    await user.selectOptions(modelSelect, nextModel);

    // 3. ASSERT
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(modelSelect).toHaveValue(nextModel);
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(apiGetMock).toHaveBeenCalledTimes(2);
  });

  it("shows only connection settings during required first-run setup", () => {
    // 1. ARRANGE
    const props = buildProps();

    // 2. ACT
    render(<ConfigurationModal {...props} required serverHost="" />);

    // 3. ASSERT
    expect(
      screen.getByRole("heading", {
        name: CONFIGURATION_LABELS.connectionCategory,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: CONFIGURATION_LABELS.llmModelsCategory,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: CONFIGURATION_LABELS.logsCategory }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: CONFIGURATION_LABELS.openLogsFolder,
      }),
    ).not.toBeInTheDocument();
  });

  it("clears, masks, and saves a replacement API key", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const apiKey = faker.string.alphanumeric({ length: 40 });
    render(<ConfigurationModal {...props} />);

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
    render(<ConfigurationModal {...props} />);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Update Server Host" }));
    await user.type(screen.getByLabelText("Server Host"), draftHost);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // 3. ASSERT
    expect(props.onUpdateServerHost).not.toHaveBeenCalled();
    expect(props.onValidateAndClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Server Host")).toHaveValue(props.serverHost);
  });

  it("clears and saves a replacement server host", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const serverHost = `${faker.internet.ipv4()}:${faker.internet.port()}`;
    render(<ConfigurationModal {...props} />);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Update Server Host" }));
    const input = screen.getByLabelText("Server Host");
    expect(input).toHaveValue("");
    await user.type(input, serverHost);
    await user.click(screen.getByRole("button", { name: "Save" }));

    // 3. ASSERT
    expect(props.onUpdateServerHost).toHaveBeenCalledWith(serverHost);
  });

  it("accepts an endpoint path and displays the canonical host after update", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const enteredHost = `${faker.internet.url().replace(/\/$/, "")}/api/v2`;
    const canonicalHost = `${enteredHost.replace(/\/api\/v2$/, "")}/api/v1`;
    props.onUpdateServerHost.mockImplementation(async () => {
      props.serverHost = canonicalHost;
    });
    const { rerender } = render(<ConfigurationModal {...props} />);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Update Server Host" }));
    await user.type(screen.getByLabelText("Server Host"), enteredHost);
    await user.click(screen.getByRole("button", { name: "Save" }));
    rerender(<ConfigurationModal {...props} />);

    // 3. ASSERT
    expect(props.onUpdateServerHost).toHaveBeenCalledWith(enteredHost);
    expect(screen.getByLabelText("Server Host")).toHaveValue(canonicalHost);
  });

  it("validates and saves the key and host together during required setup", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const apiKey = faker.string.alphanumeric({ length: 32 });
    const serverHost = `${faker.internet.ipv4()}:${faker.internet.port()}`;
    const { rerender } = render(
      <ConfigurationModal {...props} required serverHost="" />,
    );
    const doneButton = screen.getByRole("button", { name: "Done" });

    // 2. ACT
    await user.type(screen.getByLabelText("API key"), apiKey);
    await user.type(screen.getByLabelText("Server Host"), serverHost);
    await user.click(screen.getByRole("button", { name: "Save" }));
    rerender(<ConfigurationModal {...props} required serverHost={serverHost} />);
    await user.click(doneButton);

    // 3. ASSERT
    expect(props.onSetup).toHaveBeenCalledWith(apiKey, serverHost);
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(props.onValidateAndClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the edit open and reports a rejected update", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    const apiKey = faker.string.alphanumeric({ length: 32 });
    const message = faker.lorem.sentence();
    props.onUpdateApiKey.mockRejectedValueOnce(new Error(message));
    render(<ConfigurationModal {...props} />);

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
    const { rerender } = render(<ConfigurationModal {...props} />);
    await user.click(screen.getByRole("button", { name: "Update API key" }));
    await user.type(screen.getByLabelText("API key"), apiKey);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Close" }));
    rerender(<ConfigurationModal {...props} open={false} />);
    rerender(<ConfigurationModal {...props} open />);

    // 3. ASSERT
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByLabelText("API key")).toHaveValue(API_ACCESS_MASK);
    expect(props.onUpdateApiKey).not.toHaveBeenCalled();
  });

  it("closes immediately and validates saved access when Done is clicked", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    render(<ConfigurationModal {...props} />);

    // 2. ACT
    await user.click(screen.getByRole("button", { name: "Done" }));

    // 3. ASSERT
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(props.onValidateAndClose).toHaveBeenCalledTimes(1);
  });

  it("opens the logs folder without closing Configuration", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    openLogsFolderMock.mockResolvedValueOnce(undefined);
    render(<ConfigurationModal {...props} />);

    // 2. ACT
    await user.click(
      screen.getByRole("button", {
        name: CONFIGURATION_LABELS.openLogsFolder,
      }),
    );

    // 3. ASSERT
    expect(openLogsFolderMock).toHaveBeenCalledTimes(1);
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("reports a logs folder failure and leaves Configuration open", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps();
    openLogsFolderMock.mockRejectedValueOnce(new Error(faker.lorem.sentence()));
    render(<ConfigurationModal {...props} />);

    // 2. ACT
    await user.click(
      screen.getByRole("button", {
        name: CONFIGURATION_LABELS.openLogsFolder,
      }),
    );

    // 3. ASSERT
    expect(toastErrorMock).toHaveBeenCalledWith(
      CONFIGURATION_LABELS.logsFolderError,
    );
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: CONFIGURATION_LABELS.title }),
    ).toBeInTheDocument();
  });
});

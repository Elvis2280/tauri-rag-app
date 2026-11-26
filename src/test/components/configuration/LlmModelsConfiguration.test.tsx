import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { faker } from "@faker-js/faker";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LlmModelsConfiguration from "@/components/configuration/LlmModelsConfiguration";
import { OLLAMA_ENDPOINTS, OLLAMA_LABELS } from "@/constants/ollama";
import type { OllamaPreferences, OllamaStatus } from "@/types/OllamaTypes";

const { apiGetMock, apiPatchMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPatchMock: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: { get: apiGetMock, patch: apiPatchMock },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function buildProps(open = true) {
  return {
    open,
    refreshKey: 0,
    disabled: false,
    onSavingChange: vi.fn(),
  };
}

describe("LlmModelsConfiguration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeleton rows while requests are pending and clears them when loaded", async () => {
    // 1. ARRANGE
    const currentModel = `${faker.word.noun()}:${faker.string.alphanumeric(4)}`;
    const preferences: OllamaPreferences = {
      ocr: currentModel,
      editable_roles: ["ocr"],
    };
    const status: OllamaStatus = {
      is_reachable: true,
      available_models: [currentModel],
      models: [{ name: currentModel, eligible_roles: ["ocr"] }],
    };
    let completePreferences: () => void = () => {};
    let completeStatus: () => void = () => {};
    apiGetMock.mockImplementation((path: string) =>
      path === OLLAMA_ENDPOINTS.preferences
        ? new Promise<{ data: OllamaPreferences }>((resolve) => {
            completePreferences = () => resolve({ data: preferences });
          })
        : new Promise<{ data: OllamaStatus }>((resolve) => {
            completeStatus = () => resolve({ data: status });
          }),
    );

    // 2. ACT
    render(<LlmModelsConfiguration {...buildProps()} />, { wrapper: createWrapper() });
    expect(screen.getByRole("status")).toHaveTextContent(OLLAMA_LABELS.loading);

    // 3. ASSERT
    expect(screen.queryByRole("combobox", { name: "OCR" })).not.toBeInTheDocument();
    await act(async () => {
      completePreferences();
      completeStatus();
    });
    expect(await screen.findByRole("combobox", { name: "OCR" })).toBeInTheDocument();
    expect(screen.queryByText(OLLAMA_LABELS.loading)).not.toBeInTheDocument();
  });

  it("loads editable roles and saves only the changed preference", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const currentModel = `${faker.word.noun()}:${faker.string.alphanumeric(4)}`;
    const nextModel = `${faker.word.noun()}:${faker.string.alphanumeric(4)}`;
    const preferences = {
      ocr: currentModel,
      translation: currentModel,
      embedding: faker.word.noun(),
      answer: currentModel,
      formatting: currentModel,
      cleaning: currentModel,
      editable_roles: ["ocr", "translation"],
    };
    const status = {
      is_reachable: true,
      available_models: [currentModel, nextModel],
      models: [
        { name: currentModel, eligible_roles: ["translation"] },
        { name: nextModel, eligible_roles: ["ocr"] },
      ],
    };
    apiGetMock.mockImplementation(async (path: string) => ({
      data: path === OLLAMA_ENDPOINTS.status ? status : preferences,
    }));
    apiPatchMock.mockResolvedValue({
      data: { ...preferences, ocr: nextModel },
    });

    // 2. ACT
    render(<LlmModelsConfiguration {...buildProps()} />, { wrapper: createWrapper() });
    const ocrSelect = await screen.findByRole("combobox", { name: "OCR" });
    expect(await screen.findByRole("combobox", { name: "Translation" })).toHaveTextContent(currentModel);
    await user.selectOptions(ocrSelect, nextModel);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // 3. ASSERT
    await waitFor(() =>
      expect(apiPatchMock).toHaveBeenCalledWith(OLLAMA_ENDPOINTS.preferences, {
        ocr: nextModel,
      }),
    );
    expect(apiGetMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("combobox", { name: "OCR" })).toHaveTextContent(nextModel);
    expect(screen.getByRole("combobox", { name: "Translation" })).toHaveTextContent(currentModel);
  });

  it("does not request preferences while closed and reports load errors with retry", async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const props = buildProps(false);
    const loadErrorMessage = faker.lorem.sentence();
    apiGetMock
      .mockRejectedValueOnce(new Error(loadErrorMessage))
      .mockResolvedValue({
        data: {
          ocr: faker.word.noun(),
          editable_roles: ["ocr"],
          is_reachable: true,
          available_models: [],
          models: [],
        },
      });
    const { rerender } = render(
      <LlmModelsConfiguration {...props} />,
      { wrapper: createWrapper() },
    );

    // 2. ACT
    expect(apiGetMock).not.toHaveBeenCalled();
    rerender(<LlmModelsConfiguration {...props} open />);
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(loadErrorMessage);
    await user.click(screen.getByRole("button", { name: "Retry loading" }));

    // 3. ASSERT
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledTimes(4));
    expect(await screen.findByRole("combobox", { name: "OCR" })).toBeDisabled();
  });
});

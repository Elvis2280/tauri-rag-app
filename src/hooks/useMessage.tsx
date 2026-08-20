import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import apiRag from "@/lib/axios";
import { CHAT_ENDPOINTS } from "@/lib/api/endpoints";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { useChatStore } from "@/context/chatStore";
import { CHAT_ROLE, CHAT_STATUS } from "@/types/ChatTypes";
import type {
  SendMessageParams,
  SendMessageErrorResponse,
  SendMessageSuccessResponse,
} from "@/types/MessageTypes";

const SEND_MESSAGE_ERROR = "Failed to send message";

type SendMessageMutationParams = SendMessageParams & {
  userMessageId: string;
};

type SendMessageApiError = AxiosError<
  SendMessageErrorResponse | { message: string }
>;

type UseMessageResult = {
  sendMessage: (params: SendMessageParams) => Promise<SendMessageSuccessResponse>;
  loading: boolean;
  error: string | null;
};

async function postMessage({
  workspaceId,
  message,
}: SendMessageMutationParams): Promise<SendMessageSuccessResponse> {
  const response = await apiRag.post<SendMessageSuccessResponse>(
    CHAT_ENDPOINTS.send,
    {
      workspace_id: workspaceId,
      message,
    },
  );

  return response.data;
}

export default function useMessage(): UseMessageResult {
  const mutation = useMutation<
    SendMessageSuccessResponse,
    SendMessageApiError,
    SendMessageMutationParams
  >({
    mutationFn: postMessage,
    onSuccess: (response) => {
      useChatStore.getState().addMessage(
        {
          role: CHAT_ROLE.ASSISTANT,
          content: response.response,
          results: response.raw_response,
        },
        crypto.randomUUID(),
        CHAT_STATUS.COMPLETED,
      );
    },
    onError: (error) => {
      const message = extractApiErrorMessage(error, SEND_MESSAGE_ERROR);

      toast.error(SEND_MESSAGE_ERROR, { description: message });
      useChatStore.getState().addMessage(
        {
          role: CHAT_ROLE.ASSISTANT,
          content: message,
        },
        crypto.randomUUID(),
        CHAT_STATUS.ERROR,
      );
    },
  });

  const sendMessage = useCallback(
    (params: SendMessageParams) => {
      const userMessageId = crypto.randomUUID();

      useChatStore.getState().addMessage(
        {
          role: CHAT_ROLE.USER,
          content: params.message,
        },
        userMessageId,
      );

      return mutation.mutateAsync({ ...params, userMessageId });
    },
    [mutation.mutateAsync],
  );

  return {
    sendMessage,
    loading: mutation.isLoading,
    error: mutation.error
      ? extractApiErrorMessage(mutation.error, SEND_MESSAGE_ERROR)
      : null,
  };
}

import { faker } from "@faker-js/faker";
import { CHAT_ROLE, CHAT_STATUS, type ChatMessage } from "@/types/ChatTypes";

export const buildChatMessage = (
  overrides?: Partial<ChatMessage>,
): ChatMessage => ({
  id: faker.string.uuid(),
  role: CHAT_ROLE.USER,
  content: faker.lorem.sentence(),
  createdAt: faker.date.recent().toISOString(),
  status: CHAT_STATUS.COMPLETED,
  ...overrides,
});

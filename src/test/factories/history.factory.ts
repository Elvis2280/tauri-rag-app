import { faker } from "@faker-js/faker";
import { FILE_STATUS, type HistoryEntry } from "@/types/FileTypes";

export const buildHistoryEntry = (
  overrides?: Partial<HistoryEntry>,
): HistoryEntry => ({
  file_id: faker.string.uuid(),
  message: faker.lorem.sentence(),
  status: FILE_STATUS.FILE_UPLOADED,
  timestamp: faker.date.recent().toISOString(),
  step: null,
  stage: null,
  pageNumber: null,
  totalPages: null,
  currentStep: null,
  stepTotal: null,
  error: null,
  ...overrides,
});

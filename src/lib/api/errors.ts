export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (isRecord(err)) {
    const response = isRecord(err.response) ? err.response : null;
    const data = response && isRecord(response.data) ? response.data : null;

    if (data && Array.isArray(data.detail)) {
      const detailMessages = data.detail.flatMap((item) =>
        isRecord(item) && typeof item.msg === "string" ? [item.msg] : [],
      );

      if (detailMessages.length > 0) {
        return detailMessages.join("; ");
      }
    }

    if (data && typeof data.message === "string") {
      return data.message;
    }

    if (typeof err.message === "string") {
      return err.message;
    }
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

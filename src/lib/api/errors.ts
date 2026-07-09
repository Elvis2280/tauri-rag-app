export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    const e = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return e.response?.data?.message ?? e.message ?? fallback;
  }
  return fallback;
}

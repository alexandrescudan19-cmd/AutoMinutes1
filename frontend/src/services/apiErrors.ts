import axios from "axios";

export function getFriendlyApiError(error: unknown, fallback: string) {
  if (!axios.isAxiosError<{ message?: string }>(error)) {
    return fallback;
  }

  const status = error.response?.status;
  const backendMessage = error.response?.data?.message || error.message;

  if (status === 429) {
    return "Quota or rate limit reached. Try again later or switch provider if this happened during AI processing.";
  }

  if (status === 401 || status === 403) {
    return "Authorization failed. Please sign in again or check the connected provider settings.";
  }

  if (status === 503) {
    return backendMessage || "The service is temporarily unavailable. Try again after the backend or provider recovers.";
  }

  if (status && status >= 500) {
    return "Server error. Try again after the backend restarts.";
  }

  return backendMessage || fallback;
}

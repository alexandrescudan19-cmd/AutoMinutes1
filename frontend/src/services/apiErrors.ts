import axios from "axios";

export function getFriendlyApiError(error: unknown, fallback: string) {
  if (!axios.isAxiosError<{ message?: string }>(error)) {
    return fallback;
  }

  const status = error.response?.status;
  const backendMessage = error.response?.data?.message || error.message;

  if (status === 429) {
    return "AI quota or rate limit reached. Try again later or switch to fallback/free provider.";
  }

  if (status === 401 || status === 403) {
    return "AI authorization failed. Check the API key and provider settings.";
  }

  if (status === 503) {
    return backendMessage || "AI provider is unavailable. The fallback processor should be used if enabled.";
  }

  if (status && status >= 500) {
    return "Server error while processing AI results. Try again after the backend restarts.";
  }

  return backendMessage || fallback;
}

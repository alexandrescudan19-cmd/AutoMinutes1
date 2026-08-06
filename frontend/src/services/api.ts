import axios from "axios";
import { clearAuthSession, getAccessToken, isAccessTokenValid } from "./authSession";

const configuredApiUrl = import.meta.env.VITE_BACKEND_URL?.trim();

export const API_BASE_URL =
  configuredApiUrl || (import.meta.env.DEV ? "http://localhost:3500" : "");

if (!API_BASE_URL && import.meta.env.PROD) {
  throw new Error("Missing VITE_BACKEND_URL. Set it in your hosting provider before building.");
}

const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify",
];

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  // Ataseaza tokenul valid.
  const token = getAccessToken();
  if (token && isAccessTokenValid(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (token) {
    clearAuthSession();
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url ?? "";
    const isPublicAuthRequest = PUBLIC_AUTH_PATHS.some((path) => requestUrl.startsWith(path));

    // Curata sesiunea neautorizata.
    if (error.response?.status === 401 && !isPublicAuthRequest) {
      clearAuthSession();
    }

    return Promise.reject(error);
  },
);

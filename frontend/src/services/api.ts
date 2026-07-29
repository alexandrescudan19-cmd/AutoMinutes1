import axios from "axios";
import { clearAuthSession, getAccessToken, isAccessTokenValid } from "./authSession";

export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3500";

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

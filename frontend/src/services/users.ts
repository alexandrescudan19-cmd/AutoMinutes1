import { api } from "./api";

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  themePreference?: "light" | "dark" | null;
  [key: string]: unknown;
}

export function getMe() {
  return api.get<CurrentUser>("/users/me").then((res) => res.data);
}

export function updateThemePreference(themePreference: "light" | "dark") {
  return api.patch<CurrentUser>("/users/me", { themePreference }).then((res) => res.data);
}

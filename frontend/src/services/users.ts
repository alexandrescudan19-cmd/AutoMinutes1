import { api } from "./api";
import type { StoredUserProfile } from "../types";

export function getMe() {
  return api.get<StoredUserProfile>("/users/me").then((res) => res.data);
}

export function updateMe(input: Partial<Pick<StoredUserProfile, "firstName" | "lastName" | "themePreference">>) {
  return api.patch<StoredUserProfile>("/users/me", input).then((res) => res.data);
}

export function updateThemePreference(themePreference: "light" | "dark") {
  return updateMe({ themePreference });
}

import { useCallback, useSyncExternalStore } from "react";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  themePreference?: "light" | "dark" | null;
  [key: string]: unknown;
}

// cache: re-parse only when the raw localStorage string actually changes,
// otherwise return the same object reference (required by useSyncExternalStore)
let cachedRaw: string | null = null;
let cachedUser: AuthUser | null = null;

function readUser(): AuthUser | null {
  const raw = localStorage.getItem("user");
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedUser = raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}

function readToken(): string | null {
  return localStorage.getItem("accessToken");
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

export function useAuth() {
  const user = useSyncExternalStore(subscribe, readUser);
  const accessToken = useSyncExternalStore(subscribe, readToken);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    notify();
  }, []);

  const setSession = useCallback((token: string, nextUser: AuthUser) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(nextUser));
    notify();
  }, []);

  return {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    logout,
    setSession,
  };
}

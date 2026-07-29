import { useCallback, useSyncExternalStore } from "react";
import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  isAccessTokenValid,
  setAuthSession,
  subscribeAuthSession,
  type StoredAuthUser,
} from "../services/authSession";

export type AuthUser = StoredAuthUser;

export function useAuth() {
  // Asculta schimbarile de sesiune.
  const user = useSyncExternalStore(subscribeAuthSession, getStoredUser);
  const accessToken = useSyncExternalStore(subscribeAuthSession, getAccessToken);

  const logout = useCallback(() => {
    clearAuthSession();
  }, []);

  const setSession = useCallback((token: string, nextUser: AuthUser) => {
    setAuthSession(token, nextUser);
  }, []);

  return {
    user,
    accessToken,
    isAuthenticated: isAccessTokenValid(accessToken),
    logout,
    setSession,
  };
}

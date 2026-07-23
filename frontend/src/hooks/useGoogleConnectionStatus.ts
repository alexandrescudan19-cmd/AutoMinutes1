import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

export function useGoogleConnectionStatus() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ connected: boolean }>("/auth/google/status");
      setConnected(data.connected);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refetch();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refetch]);

  return { connected, loading, refetch };
}

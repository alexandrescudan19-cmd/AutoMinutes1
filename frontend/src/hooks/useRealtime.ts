import { useEffect } from "react";
import { disconnectRealtime, getRealtimeSocket, subscribeRealtime, type RealtimeEvent } from "../services/realtime";
import { subscribeAuthSession } from "../services/authSession";

export function useRealtimeConnection() {
  useEffect(() => {
    getRealtimeSocket();

    return subscribeAuthSession(() => {
      disconnectRealtime();
      getRealtimeSocket();
    });
  }, []);
}

export function useRealtimeEvent<TPayload = unknown>(
  event: RealtimeEvent,
  handler: (payload: TPayload) => void,
) {
  useEffect(() => subscribeRealtime(event, handler), [event, handler]);
}

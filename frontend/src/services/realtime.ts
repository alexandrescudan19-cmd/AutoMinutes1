import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";
import { getAccessToken, isAccessTokenValid } from "./authSession";

export type RealtimeEvent =
  | "realtime.connected"
  | "meeting.created"
  | "meeting.updated"
  | "meeting.deleted"
  | "ai.processing"
  | "ai.completed"
  | "ai.failed"
  | "actionItem.created"
  | "actionItem.updated"
  | "actionItem.deleted"
  | "actionItems.changed"
  | "notification.created"
  | "notification.read"
  | "notifications.changed"
  | "invitation.updated"
  | "invitations.changed";

let socket: Socket | null = null;

export function getRealtimeSocket() {
  const token = getAccessToken();

  if (!isAccessTokenValid(token)) {
    disconnectRealtime();
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnectionAttempts: 3,
    timeout: 10000,
  });

  return socket;
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
}

export function subscribeRealtime<TPayload = unknown>(
  event: RealtimeEvent,
  handler: (payload: TPayload) => void,
) {
  const realtimeSocket = getRealtimeSocket();
  if (!realtimeSocket) return () => {};

  realtimeSocket.on(event, handler);
  return () => {
    realtimeSocket.off(event, handler);
  };
}

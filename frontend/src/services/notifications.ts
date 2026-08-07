import { api } from "./api";
import type { AttendanceStatus, Invitation, Notification } from "../types";

export function listNotifications() {
  return api.get<Notification[]>("/meetings/notifications").then((res) => res.data);
}

export function markNotificationRead(id: string) {
  return api.patch<Notification>(`/meetings/notifications/${id}/read`).then((res) => res.data);
}

export function markAllNotificationsRead() {
  return api.patch<{ updated: number }>("/meetings/notifications/read-all").then((res) => res.data);
}

export function listInvitations() {
  return api.get<Invitation[]>("/meetings/invitations").then((res) => res.data);
}

export function respondToInvitation(id: string, status: Extract<AttendanceStatus, "Acceptat" | "Respins">) {
  return api
    .patch<{ invitation: Invitation }>(`/meetings/invitations/${id}/respond`, { status })
    .then((res) => res.data);
}

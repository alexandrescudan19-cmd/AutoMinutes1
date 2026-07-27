import { api } from "./api";
import type { Attendee, CreateAttendeeInput, UpdateAttendeeInput } from "../types";

export function listAttendees() {
  return api.get<Attendee[]>("/attendees").then((res) => res.data);
}

export function getAttendee(id: string) {
  return api.get<Attendee>(`/attendees/${id}`).then((res) => res.data);
}

export function createAttendee(input: CreateAttendeeInput) {
  return api.post<Attendee>("/attendees", input).then((res) => res.data);
}

export function updateAttendee(id: string, input: UpdateAttendeeInput) {
  return api.patch<Attendee>(`/attendees/${id}`, input).then((res) => res.data);
}

export function deleteAttendee(id: string) {
  return api.delete<void>(`/attendees/${id}`).then((res) => res.data);
}

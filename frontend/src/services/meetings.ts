import { api } from "./api";
import type {
  CreateMeetingInput,
  Meeting,
  MeetingHistoryQuery,
  MeetingHistoryResponse,
  MeetingParticipant,
  UpdateMeetingInput,
} from "../types";

export function listMeetingHistory(query: MeetingHistoryQuery) {
  return api
    .get<MeetingHistoryResponse>("/meetings/history", { params: query })
    .then((res) => res.data);
}

export function listMeetings() {
  return api.get<Meeting[]>("/meetings").then((res) => res.data);
}

export function getMeeting(id: string) {
  return api.get<Meeting>(`/meetings/${id}`).then((res) => res.data);
}

export function createMeeting(input: CreateMeetingInput) {
  return api.post<Meeting>("/meetings", input).then((res) => res.data);
}

export function updateMeeting(id: string, input: UpdateMeetingInput) {
  return api.patch<Meeting>(`/meetings/${id}`, input).then((res) => res.data);
}

export function deleteMeeting(id: string) {
  return api.delete<Meeting>(`/meetings/${id}`).then((res) => res.data);
}

export function addMeetingInvitations(id: string, participants: MeetingParticipant[]) {
  return api.post(`/meetings/${id}/invitations`, { participants }).then((res) => res.data);
}

export function removeMeetingAttendee(meetingId: string, attendeeId: string) {
  return api
    .delete<Meeting>(`/meetings/${meetingId}/attendees/${attendeeId}`)
    .then((res) => res.data);
}

export function importMeetTranscript(meetingId: string) {
  return api.post(`/meetings/${meetingId}/import-meet-transcript`).then((res) => res.data);
}

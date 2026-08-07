import { api } from "./api";
import type {
  CreateMeetingInput,
  Meeting,
  MeetingHistoryQuery,
  MeetingHistoryResponse,
  MeetingComment,
  MeetingParticipant,
  RestoreTranscriptVersionResult,
  TranscriptVersion,
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

export function listMeetingTranscriptVersions(meetingId: string) {
  return api
    .get<TranscriptVersion[]>(`/meetings/${meetingId}/transcripts`)
    .then((res) => res.data);
}

export function restoreMeetingTranscriptVersion(meetingId: string, transcriptId: string) {
  return api
    .post<RestoreTranscriptVersionResult>(`/meetings/${meetingId}/transcripts/${transcriptId}/restore`)
    .then((res) => res.data);
}

export function searchGlobal(q: string) {
  return api
    .get<{ meetings: Meeting[]; actionItems: import("../types").ActionItemListItem[] }>(
      "/meetings/search/global",
      { params: { q } },
    )
    .then((res) => res.data);
}

export function listMeetingComments(meetingId: string) {
  return api.get<MeetingComment[]>(`/meetings/${meetingId}/comments`).then((res) => res.data);
}

export function addMeetingComment(meetingId: string, message: string) {
  return api
    .post<MeetingComment>(`/meetings/${meetingId}/comments`, { message })
    .then((res) => res.data);
}

export function createMeetingShareLink(meetingId: string) {
  return api
    .post<{ token: string; url: string; meeting: Meeting }>(`/meetings/${meetingId}/share`)
    .then((res) => res.data);
}

export function getSharedMeeting(token: string) {
  return api
    .get<{ meeting: Meeting; aiResult?: import("../types").AIResult; actionItems: import("../types").ActionItem[] }>(
      `/public/meetings/share/${token}`,
    )
    .then((res) => res.data);
}

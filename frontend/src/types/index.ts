export type MeetingStatus = "Upcoming" | "In Progress" | "Completed" | "Cancelled";
export type AiStatus = "Idle" | "Processing" | "Completed" | "Failed";
export type AttendanceStatus = "Invitat" | "Acceptat" | "Respins";
export type ActionItemStatus = "Pending" | "In Progress" | "Completed";
export type MeetingHistorySort = "newest" | "oldest" | "status" | "title";

export interface Meeting {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  status: MeetingStatus;
  aiStatus: AiStatus;
  googleMeetLink?: string;
  googleCalendarEventId?: string;
  transcriptId?: string;
  aiResultId?: string;
  attendeeIds: string[];
  invitationIds: string[];
  notificationIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MeetingHistoryItem extends Meeting {
  actionItemsCount: number;
}

export interface MeetingHistoryStats {
  total: number;
  processing: number;
  completed: number;
  openActionItems: number;
}

export interface MeetingHistoryResponse {
  items: MeetingHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  stats: MeetingHistoryStats;
}

export interface MeetingHistoryQuery {
  search?: string;
  sort?: MeetingHistorySort;
  status?: MeetingStatus;
  aiStatus?: AiStatus;
  page?: number;
  pageSize?: number;
}

export interface MeetingParticipant {
  name: string;
  email?: string;
  roleInMeeting?: string;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  status?: MeetingStatus;
  createGoogleCalendarEvent?: boolean;
  attendeeIds?: string[];
  participants?: MeetingParticipant[];
  sendInAppInvitations?: boolean;
}

export type UpdateMeetingInput = Partial<CreateMeetingInput>;

export interface Attendee {
  id: string;
  name: string;
  email?: string;
  roleInMeeting: string;
  attendanceStatus: AttendanceStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAttendeeInput {
  name: string;
  email?: string;
  roleInMeeting?: string;
  attendanceStatus?: AttendanceStatus;
}

export type UpdateAttendeeInput = Partial<CreateAttendeeInput>;

export interface ActionItem {
  id: string;
  meetingId?: string;
  aiResultId?: string;
  task: string;
  responsiblePerson: string;
  dueDate?: string;
  status: ActionItemStatus;
  confidenceScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActionItemListItem extends ActionItem {
  meetingId: string;
  meetingTitle: string;
}

export interface UpdateActionItemInput {
  task?: string;
  responsiblePerson?: string;
  dueDate?: string;
  status?: ActionItemStatus;
}

export interface CreateActionItemInput {
  meetingId: string;
  task: string;
  responsiblePerson: string;
  dueDate?: string;
  status?: ActionItemStatus;
}

export interface Transcript {
  id: string;
  meetingId: string;
  content: string;
  fileFormat: string;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TranscriptVersion extends Transcript {
  version: number;
  isCurrent: boolean;
}

export interface MeetingStatistics {
  durationMinutes?: number;
  participantCount?: number;
  actionItemCount?: number;
  processingStatus?: string;
}

export interface AIResult {
  id: string;
  meetingId: string;
  transcriptId?: string;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  followUpNotes?: string;
  actionItemIds: string[];
  meetingStatistics?: MeetingStatistics;
  generatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcessTranscriptInput {
  meetingId: string;
  transcriptId?: string;
  transcript?: string;
  fileFormat?: string;
  language?: string;
}

export interface ProcessTranscriptResult {
  meetingId: string;
  transcript: Transcript;
  aiResult: AIResult;
  actionItems: ActionItem[];
}

export interface RestoreTranscriptVersionResult {
  meeting: Meeting;
  transcript: TranscriptVersion;
  aiResultId?: string;
}

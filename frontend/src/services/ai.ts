import { api } from "./api";
import type { ActionItem, AIResult, ProcessTranscriptInput, ProcessTranscriptResult } from "../types";

export function getAiResult(aiResultId: string) {
  return api.get<AIResult>(`/ai/results/${aiResultId}`).then((res) => res.data);
}

export function getAiResultActionItems(aiResultId: string) {
  return api
    .get<{ aiResultId: string; meetingId: string; meetingTitle: string; actionItems: ActionItem[] }>(
      `/ai/results/${aiResultId}/action-items`,
    )
    .then((res) => res.data);
}

export function processTranscript(input: ProcessTranscriptInput) {
  return api
    .post<ProcessTranscriptResult>("/ai/process-transcript", input)
    .then((res) => res.data);
}

export function uploadTranscriptFile(meetingId: string, file: File, language = "ro") {
  const formData = new FormData();
  formData.append("file", file);

  return api
    .post<ProcessTranscriptResult>("/ai/process-transcript/upload", formData, {
      params: { meetingId, language },
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => res.data);
}

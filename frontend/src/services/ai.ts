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

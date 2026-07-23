import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Card } from "../../../atoms";
import ActionItemList from "../../action-item/ActionItemList/ActionItemList.tsx";
import TranscriptUploadForm from "../../transcript/TranscriptUploadForm/TranscriptUploadForm.tsx";
import { getAiResult, getAiResultActionItems } from "../../../../services/ai";
import type { ActionItem, AIResult, Meeting, ProcessTranscriptResult } from "../../../../types";

export interface AiResultsPanelProps {
  meeting: Meeting;
  onMeetingChanged: () => void;
}

export default function AiResultsPanel({ meeting, onMeetingChanged }: AiResultsPanelProps) {
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadResult = useCallback(async (aiResultId: string) => {
    setIsLoading(true);
    setError("");
    try {
      const [result, actionItemsResponse] = await Promise.all([
        getAiResult(aiResultId),
        getAiResultActionItems(aiResultId),
      ]);
      setAiResult(result);
      setActionItems(actionItemsResponse.actionItems);
    } catch {
      setError("Nu am putut incarca rezultatele AI.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (meeting.aiResultId) {
        void loadResult(meeting.aiResultId);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [meeting.aiResultId, loadResult]);

  const handleProcessed = (result: ProcessTranscriptResult) => {
    toast.success("Transcriptul a fost procesat cu succes.");
    setAiResult(result.aiResult);
    setActionItems(result.actionItems);
    onMeetingChanged();
  };

  return (
    <div className="flex flex-col gap-5">
      {aiResult && (
        <div className="flex flex-col gap-4">
          <Card title="Rezumat">
            <p className="text-sm text-gray-700">{aiResult.summary}</p>
          </Card>

          {aiResult.keyPoints.length > 0 && (
            <Card title="Puncte cheie">
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                {aiResult.keyPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </Card>
          )}

          {aiResult.decisions.length > 0 && (
            <Card title="Decizii">
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                {aiResult.decisions.map((decision, index) => (
                  <li key={index}>{decision}</li>
                ))}
              </ul>
            </Card>
          )}

          {aiResult.followUpNotes && (
            <Card title="Follow-up notes">
              <p className="text-sm text-gray-700">{aiResult.followUpNotes}</p>
            </Card>
          )}

          <Card title="Action items">
            <ActionItemList
              items={actionItems}
              onChanged={() => meeting.aiResultId && void loadResult(meeting.aiResultId)}
            />
          </Card>
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-500">Se incarca rezultatele AI...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card title={aiResult ? "Reproceseaza transcriptul" : "Transcript"}>
        <TranscriptUploadForm
          meetingId={meeting.id}
          submitLabel={aiResult ? "Reproceseaza" : "Proceseaza cu AI"}
          onProcessed={handleProcessed}
        />
      </Card>
    </div>
  );
}

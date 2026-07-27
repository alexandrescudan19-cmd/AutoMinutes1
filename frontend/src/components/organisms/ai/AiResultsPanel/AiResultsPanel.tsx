import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiZap } from "react-icons/fi";
import { Card } from "../../../atoms";
import ActionItemList from "../../action-item/ActionItemList/ActionItemList.tsx";
import TranscriptUploadForm from "../../transcript/TranscriptUploadForm/TranscriptUploadForm.tsx";
import { getAiResult, getAiResultActionItems } from "../../../../services/ai";
import type { ActionItem, AIResult, Meeting, ProcessTranscriptResult } from "../../../../types";

export interface AiResultsPanelProps {
  meeting: Meeting;
  onMeetingChanged: () => void;
}

type SubTab = "transcript" | "summary" | "keyPoints" | "decisions" | "followUp" | "actionItems";

export default function AiResultsPanel({ meeting, onMeetingChanged }: AiResultsPanelProps) {
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [subTab, setSubTab] = useState<SubTab>(meeting.aiResultId ? "summary" : "transcript");

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
      setError("Couldn't load AI results.");
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

  // A transcript can already be processing in the background (e.g. it was
  // attached when the meeting was created) - poll until it's done, so this tab
  // picks up the result without needing a manual refresh, and so the "Process
  // with AI" form stays hidden the whole time instead of allowing a second submit.
  // onMeetingChanged is a new inline function on every parent render, so it's read
  // through a ref instead of a dependency - otherwise the interval would keep
  // getting torn down and recreated before it ever gets a chance to fire.
  const isProcessing = meeting.aiStatus === "Processing";
  const onMeetingChangedRef = useRef(onMeetingChanged);

  useEffect(() => {
    onMeetingChangedRef.current = onMeetingChanged;
  }, [onMeetingChanged]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => onMeetingChangedRef.current(), 4000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleProcessed = (result: ProcessTranscriptResult) => {
    toast.success("Transcript processed successfully.");
    setAiResult(result.aiResult);
    setActionItems(result.actionItems);
    setSubTab("summary");
    onMeetingChanged();
  };

  const subTabs: { key: SubTab; label: string }[] = [{ key: "transcript", label: "Transcript" }];
  if (aiResult) {
    subTabs.push({ key: "summary", label: "Summary" });
    if (aiResult.keyPoints.length > 0) subTabs.push({ key: "keyPoints", label: "Key points" });
    if (aiResult.decisions.length > 0) subTabs.push({ key: "decisions", label: "Decisions" });
    if (aiResult.followUpNotes) subTabs.push({ key: "followUp", label: "Follow-up" });
    subTabs.push({ key: "actionItems", label: "Action items" });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSubTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              subTab === tab.key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading AI results...</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {subTab === "transcript" && (
        <Card title={aiResult ? "Reprocess transcript" : "Transcript"}>
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <FiZap className="ai-pulse-icon text-3xl text-brand" aria-hidden="true" />
              <p className="ai-shimmer-text text-base font-medium">Processing your transcript with AI…</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This can take a minute or two - feel free to keep browsing, this will update on its own.
              </p>
            </div>
          ) : (
            <TranscriptUploadForm
              meetingId={meeting.id}
              submitLabel={aiResult ? "Reprocess" : "Process with AI"}
              onProcessed={handleProcessed}
            />
          )}
        </Card>
      )}

      {subTab === "summary" && aiResult && (
        <Card title="Summary">
          <p className="text-sm text-gray-700 dark:text-gray-300">{aiResult.summary}</p>
        </Card>
      )}

      {subTab === "keyPoints" && aiResult && (
        <Card title="Key points">
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
            {aiResult.keyPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </Card>
      )}

      {subTab === "decisions" && aiResult && (
        <Card title="Decisions">
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
            {aiResult.decisions.map((decision, index) => (
              <li key={index}>{decision}</li>
            ))}
          </ul>
        </Card>
      )}

      {subTab === "followUp" && aiResult && (
        <Card title="Follow-up notes">
          <p className="text-sm text-gray-700 dark:text-gray-300">{aiResult.followUpNotes}</p>
        </Card>
      )}

      {subTab === "actionItems" && aiResult && (
        <Card title="Action items">
          <ActionItemList
            items={actionItems}
            onChanged={() => meeting.aiResultId && void loadResult(meeting.aiResultId)}
          />
        </Card>
      )}
    </div>
  );
}

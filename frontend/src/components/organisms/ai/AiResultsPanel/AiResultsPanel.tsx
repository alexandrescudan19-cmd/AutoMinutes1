import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiRotateCcw, FiZap } from "react-icons/fi";
import { Button, Card } from "../../../atoms";
import { Modal } from "../../../molecules/common";
import ActionItemList from "../../action-item/ActionItemList/ActionItemList.tsx";
import TranscriptUploadForm from "../../transcript/TranscriptUploadForm/TranscriptUploadForm.tsx";
import { getAiResult } from "../../../../services/ai";
import { listMeetingActionItems } from "../../../../services/actionItems";
import {
  listMeetingTranscriptVersions,
  restoreMeetingTranscriptVersion,
} from "../../../../services/meetings";
import { formatDateTime } from "../../../../utils/date.ts";
import type {
  ActionItem,
  AIResult,
  Meeting,
  ProcessTranscriptResult,
  TranscriptVersion,
} from "../../../../types";

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
  const [transcriptVersions, setTranscriptVersions] = useState<TranscriptVersion[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState("");
  const [restoringTranscriptId, setRestoringTranscriptId] = useState("");

  const loadActionItems = useCallback(async () => {
    try {
      setActionItems(await listMeetingActionItems(meeting.id));
    } catch {
      toast.error("Couldn't load action items.");
    }
  }, [meeting.id]);

  const loadResult = useCallback(async (aiResultId: string) => {
    // Incarca rezultatele AI curente.
    setIsLoading(true);
    setError("");
    try {
      const result = await getAiResult(aiResultId);
      setAiResult(result);
    } catch {
      setError("Couldn't load AI results.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTranscriptVersions = useCallback(async () => {
    // Incarca istoricul transcripturilor.
    setIsHistoryLoading(true);
    try {
      setTranscriptVersions(await listMeetingTranscriptVersions(meeting.id));
    } catch {
      toast.error("Couldn't load transcript history.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, [meeting.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (meeting.aiResultId) {
        void loadResult(meeting.aiResultId);
      } else {
        setAiResult(null);
      }
      void loadActionItems();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [meeting.aiResultId, loadActionItems, loadResult]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTranscriptVersions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTranscriptVersions]);

  const isProcessing = meeting.aiStatus === "Processing";
  const onMeetingChangedRef = useRef(onMeetingChanged);

  useEffect(() => {
    onMeetingChangedRef.current = onMeetingChanged;
  }, [onMeetingChanged]);

  useEffect(() => {
    if (!isProcessing) return;
    // Reimprospateaza cat timp proceseaza.
    const interval = setInterval(() => onMeetingChangedRef.current(), 4000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleProcessed = (result: ProcessTranscriptResult) => {
    // Afiseaza rezultatul nou generat.
    toast.success("Transcript processed successfully.");
    setAiResult(result.aiResult);
    setActionItems(result.actionItems);
    setSubTab("summary");
    void loadActionItems();
    void loadTranscriptVersions();
    onMeetingChanged();
  };

  const handleRestoreTranscript = async (transcriptId: string) => {
    // Restaureaza versiunea selectata.
    setRestoringTranscriptId(transcriptId);
    try {
      const result = await restoreMeetingTranscriptVersion(meeting.id, transcriptId);
      toast.success("Transcript version restored.");

      if (result.aiResultId) {
        await loadResult(result.aiResultId);
        await loadActionItems();
        setSubTab("summary");
      } else {
        setAiResult(null);
        await loadActionItems();
        setSubTab("transcript");
      }

      await loadTranscriptVersions();
      onMeetingChanged();
    } catch {
      toast.error("Couldn't restore transcript version.");
    } finally {
      setRestoringTranscriptId("");
    }
  };

  const subTabs: { key: SubTab; label: string }[] = [{ key: "transcript", label: "Transcript" }];
  if (aiResult) {
    subTabs.push({ key: "summary", label: "Summary" });
    if (aiResult.keyPoints.length > 0) subTabs.push({ key: "keyPoints", label: "Key points" });
    if (aiResult.decisions.length > 0) subTabs.push({ key: "decisions", label: "Decisions" });
    if (aiResult.followUpNotes) subTabs.push({ key: "followUp", label: "Follow-up" });
  }
  subTabs.push({ key: "actionItems", label: "Action items" });

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
        <Card
          title={aiResult ? "Reprocess transcript" : "Transcript"}
          actions={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isHistoryLoading && isHistoryOpen}
              onClick={() => {
                setIsHistoryOpen(true);
                void loadTranscriptVersions();
              }}
            >
              History
            </Button>
          }
        >
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

      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Transcript history"
        size="lg"
        footer={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={isHistoryLoading}
            onClick={() => void loadTranscriptVersions()}
          >
            Refresh
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Previous transcript uploads and AI processing versions for this meeting.
          </p>

          {transcriptVersions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No transcript versions yet.
            </p>
          ) : (
            <div className="space-y-2">
              {transcriptVersions.map((version) => (
                <div
                  key={version.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() =>
                        setExpandedTranscriptId((current) =>
                          current === version.id ? "" : version.id,
                        )
                      }
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Version {version.version}
                        </span>
                        {version.isCurrent && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                            Current
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(version.uploadedAt ?? version.createdAt ?? "")}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {version.fileFormat}
                        </span>
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<FiRotateCcw aria-hidden="true" />}
                      disabled={version.isCurrent}
                      isLoading={restoringTranscriptId === version.id}
                      onClick={() => void handleRestoreTranscript(version.id)}
                    >
                      Restore
                    </Button>
                  </div>
                  {expandedTranscriptId === version.id && (
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-t border-gray-100 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                      {version.content}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

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

      {subTab === "actionItems" && (
        <Card title="Action items">
          <ActionItemList
            items={actionItems}
            meetingId={meeting.id}
            allowCreate
            onChanged={() => {
              void loadActionItems();
              onMeetingChanged();
            }}
          />
        </Card>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import Modal from "../../common/Modal/Modal.tsx";
import StatusBadge from "../../common/StatusBadge/StatusBadge.tsx";
import Tabs from "../../common/Tabs/Tabs.tsx";
import EmptyState from "../../common/EmptyState/EmptyState.tsx";
import Loader from "../../../atoms/Loader/Loader.tsx";
import { api } from "../../../../services/api";

export interface MeetingDetails {
  id: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  aiStatus: string;
  attendeeIds: string[];
  transcriptId?: string;   // legatura catre transcript
  aiResultId?: string;     // legatura catre rezultatul AI
}

// Forma rezultatului AI, asa cum vine de la backend
interface AiResult {
  summary?: string;
  keyPoints?: string[];
  decisions?: string[];
  actionItems?: Array<{
    id?: string;
    task?: string;
    description?: string;
    assignee?: string;
    status?: string;
    deadline?: string;
  }>;
}

export interface MeetingDetailsModalProps {
  meeting: MeetingDetails | null;
  onClose: () => void;
}

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const dateLabel = s.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const startTime = s.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  const endTime = e.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} · ${startTime} - ${endTime}`;
}

export default function MeetingDetailsModal({ meeting, onClose }: MeetingDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // cand se deschide o alta intalnire, resetam pe primul tab
  useEffect(() => {
    setActiveTab("overview");
    setAiResult(null);
    setTranscript("");
  }, [meeting?.id]);

  // aducem datele AI + transcript doar cand utilizatorul intra pe tab-ul respectiv
  useEffect(() => {
    if (!meeting) return;
    if (activeTab !== "ai" && activeTab !== "actions") return;
    if (aiResult) return; 

    const fetchAiData = async () => {
      setIsLoading(true);
      try {
        if (meeting.aiResultId) {
          const { data } = await api.get<AiResult>(`/ai/results/${meeting.aiResultId}`);
          setAiResult(data);
        }
        if (meeting.transcriptId) {
          const { data } = await api.get(`/transcripts/${meeting.transcriptId}`);
          setTranscript(data?.content ?? "");
        }
      } catch {
        
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAiData();
  }, [activeTab, meeting, aiResult]);

  const actionItems = aiResult?.actionItems ?? [];

  return (
    <Modal isOpen={!!meeting} onClose={onClose} title={meeting?.title ?? ""} size="lg">
      {meeting && (
        <div className="flex flex-col gap-4">
          <Tabs
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "ai", label: "Transcript & AI" },
              { id: "attendees", label: "Attendees", badge: meeting.attendeeIds?.length ?? 0 },
              { id: "actions", label: "Action Items", badge: actionItems.length || undefined },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
          />

          {/* TAB 1: Overview */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={meeting.status} />
                <StatusBadge status={meeting.aiStatus} />
              </div>
              <p className="text-sm text-gray-600">
                {formatRange(meeting.startDateTime, meeting.endDateTime)}
              </p>
              {meeting.description ? (
                <p className="text-sm text-gray-700">{meeting.description}</p>
              ) : (
                <p className="text-sm text-gray-400">Fără descriere.</p>
              )}
            </div>
          )}

          {/* TAB 2: Transcript & AI */}
          {activeTab === "ai" && (
            <div className="flex flex-col gap-4">
              {isLoading && <Loader label="Se încarcă..." />}

              {!isLoading && !aiResult && !transcript && (
                <EmptyState
                  title="Niciun rezultat AI"
                  description="Transcriptul nu a fost procesat încă."
                />
              )}

              {!isLoading && transcript && (
                <div>
                  <h4 className="mb-1 text-sm font-medium text-gray-900">Transcript</h4>
                  <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                    {transcript}
                  </pre>
                </div>
              )}

              {!isLoading && aiResult?.summary && (
                <div>
                  <h4 className="mb-1 text-sm font-medium text-gray-900">Rezumat</h4>
                  <p className="text-sm text-gray-700">{aiResult.summary}</p>
                </div>
              )}

              {!isLoading && (aiResult?.keyPoints?.length ?? 0) > 0 && (
                <div>
                  <h4 className="mb-1 text-sm font-medium text-gray-900">Puncte cheie</h4>
                  <ul className="list-disc pl-5 text-sm text-gray-700">
                    {aiResult!.keyPoints!.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!isLoading && (aiResult?.decisions?.length ?? 0) > 0 && (
                <div>
                  <h4 className="mb-1 text-sm font-medium text-gray-900">Decizii</h4>
                  <ul className="list-disc pl-5 text-sm text-gray-700">
                    {aiResult!.decisions!.map((decision, i) => (
                      <li key={i}>{decision}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Attendees */}
          {activeTab === "attendees" && (
            <div>
              {meeting.attendeeIds?.length ? (
                <p className="text-sm text-gray-600">
                  {meeting.attendeeIds.length} participanți înregistrați.
                </p>
              ) : (
                <EmptyState
                  title="Niciun participant"
                  description="Nu au fost adăugați participanți la această întâlnire."
                />
              )}
            </div>
          )}

          {/* TAB 4: Action Items */}
          {activeTab === "actions" && (
            <div className="flex flex-col gap-2">
              {isLoading && <Loader label="Se încarcă..." />}

              {!isLoading && actionItems.length === 0 && (
                <EmptyState
                  title="Niciun action item"
                  description="AI-ul nu a extras acțiuni din această întâlnire."
                />
              )}

              {!isLoading &&
                actionItems.map((item, i) => (
                  <div
                    key={item.id ?? i}
                    className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {item.task ?? item.description ?? "Fără titlu"}
                      </p>
                      {item.assignee && (
                        <p className="text-xs text-gray-500">Asignat: {item.assignee}</p>
                      )}
                    </div>
                    {item.status && <StatusBadge status={item.status} />}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2, FiVideo } from "react-icons/fi";
import Modal from "../../common/Modal/Modal.tsx";
import StatusBadge from "../../common/StatusBadge/StatusBadge.tsx";
import ConfirmDialog from "../../common/ConfirmDialog/ConfirmDialog.tsx";
import { Button } from "../../../atoms";
import MeetingForm from "../../../organisms/meeting/MeetingForm/MeetingForm.tsx";
import MeetingAttendeesPanel from "../../../organisms/attendee/MeetingAttendeesPanel/MeetingAttendeesPanel.tsx";
import AiResultsPanel from "../../../organisms/ai/AiResultsPanel/AiResultsPanel.tsx";
import { getMeeting } from "../../../../services/meetings";
import { useMeetingsStore } from "../../../../stores/meetingsStore";
import type { Meeting } from "../../../../types";

export interface MeetingDetailsModalProps {
  meetingId: string | null;
  onClose: () => void;
}

type Tab = "overview" | "attendees" | "ai";

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

function toDateTimeLocal(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "attendees", label: "Participanti" },
  { key: "ai", label: "Transcript & AI" },
];

export default function MeetingDetailsModal({ meetingId, onClose }: MeetingDetailsModalProps) {
  const updateMeeting = useMeetingsStore((state) => state.updateMeeting);
  const deleteMeeting = useMeetingsStore((state) => state.deleteMeeting);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const refetchMeeting = async (id: string) => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getMeeting(id);
      setMeeting(data);
    } catch {
      setError("Nu am putut incarca sedinta.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (meetingId) {
      setActiveTab("overview");
      setIsEditing(false);
      void refetchMeeting(meetingId);
    } else {
      setMeeting(null);
    }
  }, [meetingId]);

  const handleUpdate = async (values: {
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    status: string;
    attendeeIds: string[];
  }) => {
    if (!meeting) return;
    await updateMeeting(meeting.id, {
      title: values.title,
      description: values.description,
      startDateTime: values.startDateTime,
      endDateTime: values.endDateTime,
      status: values.status as Meeting["status"],
      attendeeIds: values.attendeeIds,
    });
    setIsEditing(false);
    await refetchMeeting(meeting.id);
  };

  const handleDelete = async () => {
    if (!meeting) return;
    setIsDeleting(true);
    try {
      await deleteMeeting(meeting.id);
      setIsDeleteOpen(false);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={!!meetingId} onClose={onClose} title={meeting?.title ?? ""} size="xl">
      {isLoading && <p className="text-sm text-gray-500">Se incarca...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {meeting && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-1 border-b border-gray-100">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-[480px]">
            {activeTab === "overview" &&
              (isEditing ? (
                <MeetingForm
                  initialValues={{
                    title: meeting.title,
                    description: meeting.description ?? "",
                    startDateTime: toDateTimeLocal(meeting.startDateTime),
                    endDateTime: toDateTimeLocal(meeting.endDateTime),
                    status: meeting.status,
                    attendeeIds: meeting.attendeeIds,
                  }}
                  onSubmit={handleUpdate}
                  onCancel={() => setIsEditing(false)}
                  submitLabel="Salveaza modificarile"
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={meeting.status} />
                    <StatusBadge status={meeting.aiStatus} />
                  </div>

                  <p className="text-sm text-gray-600">
                    {formatRange(meeting.startDateTime, meeting.endDateTime)}
                  </p>

                  {meeting.description && (
                    <p className="text-sm text-gray-700">{meeting.description}</p>
                  )}

                  <p className="text-sm text-gray-500">
                    {meeting.attendeeIds.length} participanti
                  </p>

                  {meeting.googleMeetLink && (
                    <a
                      href={meeting.googleMeetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-fit items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-medium text-brand hover:bg-brand/10"
                    >
                      <FiVideo aria-hidden="true" />
                      Alatura-te pe Google Meet
                    </a>
                  )}

                  <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      leftIcon={<FiEdit2 aria-hidden="true" />}
                      onClick={() => setIsEditing(true)}
                    >
                      Editeaza
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      leftIcon={<FiTrash2 aria-hidden="true" />}
                      onClick={() => setIsDeleteOpen(true)}
                    >
                      Sterge
                    </Button>
                  </div>
                </div>
              ))}

            {activeTab === "attendees" && (
              <MeetingAttendeesPanel meeting={meeting} onChanged={() => void refetchMeeting(meeting.id)} />
            )}

            {activeTab === "ai" && (
              <AiResultsPanel meeting={meeting} onMeetingChanged={() => void refetchMeeting(meeting.id)} />
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Sterge sedinta?"
        message="Aceasta actiune este ireversibila. Sigur vrei sa stergi aceasta sedinta?"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </Modal>
  );
}
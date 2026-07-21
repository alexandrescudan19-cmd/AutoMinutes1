import Modal from "../../common/Modal/Modal.tsx";
import StatusBadge from "../../common/StatusBadge/StatusBadge.tsx";

export interface MeetingDetails {
  id: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  aiStatus: string;
  attendeeIds: string[];
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
  const startTime = s.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = e.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateLabel} · ${startTime} - ${endTime}`;
}

export default function MeetingDetailsModal({
  meeting,
  onClose,
}: MeetingDetailsModalProps) {
  return (
    <Modal
      isOpen={!!meeting}
      onClose={onClose}
      title={meeting?.title ?? ""}
      size="lg"
    >
      {meeting && (
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

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">
              {meeting.attendeeIds?.length ?? 0} participanți
            </p>
          </div>

          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-400">
            Rezumatul AI, punctele cheie și acțiunile apar aici odată ce
            backend-ul expune endpoint-ul de citire a rezultatelor AI.
          </div>
        </div>
      )}
    </Modal>
  );
}

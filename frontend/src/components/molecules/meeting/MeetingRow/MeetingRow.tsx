import StatusBadge from '../../common/StatusBadge/StatusBadge.tsx';
import type { MeetingHistoryItem } from '../../../../types';

export type Meeting = MeetingHistoryItem;

export interface MeetingRowProps {
  meeting: Meeting;
  onClick?: (meeting: Meeting) => void;
}

// Transforma data bruta 
function formatDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw; 
  return d.toLocaleString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MeetingRow({ meeting, onClick }: MeetingRowProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(meeting)}
      className="flex w-full items-center gap-4 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
    >
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-gray-900">{meeting.title}</p>
        {meeting.description && (
          <p className="truncate text-sm text-gray-500">{meeting.description}</p>
        )}
      </div>

      <div className="hidden w-40 shrink-0 text-sm text-gray-600 sm:block">
        {formatDate(meeting.startDateTime)}
      </div>

      <div className="w-28 shrink-0">
        <StatusBadge status={meeting.status} />
      </div>

      <div className="hidden w-16 shrink-0 text-center text-sm text-gray-600 sm:block">
        {meeting.attendeeIds?.length ?? 0}
      </div>

      <div className="w-16 shrink-0 text-center text-sm text-gray-600">
        {meeting.actionItemsCount ?? 0}
      </div>
    </button>
  );
}

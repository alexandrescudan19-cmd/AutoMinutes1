import StatusBadge from '../../common/StatusBadge/StatusBadge.tsx';
import { formatDateTime } from '../../../../utils/date.ts';
import type { MeetingHistoryItem } from '../../../../types';

export type Meeting = MeetingHistoryItem;

export interface MeetingRowProps {
  meeting: Meeting;
  onClick?: (meeting: Meeting) => void;
}

export default function MeetingRow({ meeting, onClick }: MeetingRowProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(meeting)}
      className="flex w-full items-center gap-4 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
    >
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{meeting.title}</p>
        {meeting.description && (
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{meeting.description}</p>
        )}
      </div>

      <div className="hidden w-40 shrink-0 text-sm text-gray-600 dark:text-gray-400 sm:block">
        {formatDateTime(meeting.startDateTime)}
      </div>

      <div className="w-28 shrink-0">
        <StatusBadge status={meeting.status} />
      </div>

      <div className="hidden w-16 shrink-0 text-center text-sm text-gray-600 dark:text-gray-400 sm:block">
        {meeting.attendeeIds?.length ?? 0}
      </div>

      <div className="w-16 shrink-0 text-center text-sm text-gray-600 dark:text-gray-400">
        {meeting.actionItemsCount ?? 0}
      </div>
    </button>
  );
}

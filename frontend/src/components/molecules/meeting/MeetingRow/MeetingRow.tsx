import StatusBadge from '../../common/StatusBadge/StatusBadge.tsx';
import { getStatusDotColor } from '../../common/StatusBadge/statusBadgeUtils.ts';
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
      className="block w-full min-w-0 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
      aria-label={`Open meeting ${meeting.title}`}
    >
      <div className="flex min-w-0 items-start gap-3 px-4 py-3 sm:hidden">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${getStatusDotColor(meeting.status)}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words font-medium text-gray-900 dark:text-gray-100">
            {meeting.title}
          </p>
          <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
            {formatDateTime(meeting.startDateTime)}
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge status={meeting.status} />
            <StatusBadge
              status={meeting.aiStatus}
              label={meeting.aiStatus === "Completed" ? "AI done" : undefined}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{meeting.attendeeIds?.length ?? 0} people</span>
            <span>{meeting.actionItemsCount ?? 0} tasks</span>
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 grid-cols-[minmax(0,1fr)_10rem_8rem_8rem_5rem_5rem] gap-3 px-4 py-3 sm:grid sm:items-center">
        <div className="min-w-0">
          <p className="break-words font-medium text-gray-900 dark:text-gray-100">{meeting.title}</p>
          {meeting.description && (
            <p className="mt-1 break-words text-sm text-gray-500 dark:text-gray-400">{meeting.description}</p>
          )}
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTime(meeting.startDateTime)}
        </div>

        <div>
          <StatusBadge status={meeting.status} />
        </div>

        <div>
          <StatusBadge
            status={meeting.aiStatus}
            label={meeting.aiStatus === "Completed" ? "AI done" : undefined}
          />
        </div>

        <div className="text-sm text-gray-600 sm:text-center dark:text-gray-400">
          {meeting.attendeeIds?.length ?? 0}
        </div>

        <div className="text-sm text-gray-600 sm:text-center dark:text-gray-400">
          {meeting.actionItemsCount ?? 0}
        </div>
      </div>
    </button>
  );
}

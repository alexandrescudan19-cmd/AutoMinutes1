import { FiInbox } from 'react-icons/fi';
import EmptyState from '../../common/EmptyState/EmptyState.tsx';
import MeetingRow, { type Meeting } from '../MeetingRow/MeetingRow.tsx';

export interface MeetingListProps {
  meetings: Meeting[];
  onSelect?: (meeting: Meeting) => void;
  query?: string;
}

export default function MeetingList({ meetings, onSelect, query = '' }: MeetingListProps) {
  return (
    <div className="flex flex-col gap-4">
      {meetings.length === 0 ? (
        <EmptyState
          icon={<FiInbox />}
          title={query ? 'No results' : 'No meetings yet'}
          description={
            query
              ? `We couldn't find any meetings for "${query}".`
              : 'Create your first meeting to get started.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="hidden grid-cols-[minmax(0,1fr)_10rem_8rem_8rem_5rem_5rem] gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-400 sm:grid">
            <span>Meeting</span>
            <span>Starts</span>
            <span>Status</span>
            <span>AI</span>
            <span className="text-center">People</span>
            <span className="text-center">Tasks</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {meetings.map((meeting) => (
              <MeetingRow key={meeting.id} meeting={meeting} onClick={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

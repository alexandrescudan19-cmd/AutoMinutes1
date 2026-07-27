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
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          {meetings.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} onClick={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

import { FiInbox } from 'react-icons/fi';
import EmptyState from '../../common/EmptyState/EmptyState.tsx';
import SearchBar from '../../common/SearchBar/SearchBar.tsx';
import MeetingRow, { type Meeting } from '../MeetingRow/MeetingRow.tsx';

export interface MeetingListProps {
  meetings: Meeting[];
  onSelect?: (meeting: Meeting) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
}

export default function MeetingList({
  meetings,
  onSelect,
  query = '',
  onQueryChange,
}: MeetingListProps) {
  return (
    <div className="flex flex-col gap-4">
      <SearchBar
        value={query}
        onChange={onQueryChange ?? (() => undefined)}
        placeholder="Cauta intalniri..."
      />

      {meetings.length === 0 ? (
        <EmptyState
          icon={<FiInbox />}
          title={query ? 'Niciun rezultat' : 'Nicio intalnire inca'}
          description={
            query
              ? `Nu am gasit intalniri pentru "${query}".`
              : 'Creeaza prima intalnire ca sa incepi.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          {meetings.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} onClick={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

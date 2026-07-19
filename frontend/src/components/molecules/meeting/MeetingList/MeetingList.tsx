import { useState } from 'react';
import { FiInbox } from 'react-icons/fi';
import SearchBar from '../../common/SearchBar/SearchBar.tsx';
import EmptyState from '../../common/EmptyState/EmptyState.tsx';
import MeetingRow, { type Meeting } from '../MeetingRow/MeetingRow.tsx';

export interface MeetingListProps {
  meetings: Meeting[];                     
  onSelect?: (meeting: Meeting) => void;   
}

export default function MeetingList({ meetings, onSelect }: MeetingListProps) {
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = q
    ? meetings.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.description?.toLowerCase().includes(q) ?? false),
      )
    : meetings;

  return (
    <div className="flex flex-col gap-4">
      <SearchBar value={query} onChange={setQuery} placeholder="Caută întâlniri…" />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FiInbox />}
          title={query ? 'Niciun rezultat' : 'Nicio întâlnire încă'}
          description={
            query
              ? `Nu am găsit întâlniri pentru „${query}".`
              : 'Creează prima întâlnire ca să începi.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          {filtered.map((m) => (
            <MeetingRow key={m.id} meeting={m} onClick={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
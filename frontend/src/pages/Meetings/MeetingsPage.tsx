import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../../components/templates";
import {
  MeetingList,
  StatCard,
  MeetingDetailsModal,
  type Meeting,
} from "../../components/molecules";
import { api } from "../../services/api";

interface RawMeeting {
  id: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  aiStatus: string;
  attendeeIds: string[];
}

// transforma forma bruta de la API in forma pe care o cere MeetingRow
function toMeetingRowData(raw: RawMeeting): Meeting {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    startDateTime: raw.startDateTime,
    endDateTime: raw.endDateTime,
    status: raw.status,
    aiStatus: raw.aiStatus,
    attendeeIds: raw.attendeeIds ?? [],
    actionItemsCount: 0, // TODO: cand exista endpoint pentru action items
  };
}

function sortRawMeetings(meetings: RawMeeting[]) {
  return [...meetings].sort(
    (left, right) =>
      new Date(right.startDateTime).getTime() -
      new Date(left.startDateTime).getTime(),
  );
}

export default function MeetingsPage() {
  const [rawMeetings, setRawMeetings] = useState<RawMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<RawMeeting | null>(
    null,
  );

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const { data } = await api.get<RawMeeting[]>("/meetings");
        setRawMeetings(data);
      } catch {
        setError("Nu am putut încărca ședințele. Încearcă din nou.");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchMeetings();
  }, []);

  const sortedRawMeetings = useMemo(() => sortRawMeetings(rawMeetings), [rawMeetings]);
  const meetings = sortedRawMeetings.map(toMeetingRowData);
  const processingCount = rawMeetings.filter(
    (m) => m.aiStatus === "Processing",
  ).length;
  const completedCount = rawMeetings.filter(
    (m) => m.aiStatus === "Completed",
  ).length;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>

        <div className="flex gap-4">
          <StatCard
            label="Total meetings"
            value={rawMeetings.length}
            accent="gray"
          />
          <StatCard
            label="AI processing"
            value={processingCount}
            accent="amber"
          />
          <StatCard
            label="AI completed"
            value={completedCount}
            accent="green"
          />
        </div>

        {isLoading && <p className="text-sm text-gray-500">Se încarcă…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isLoading && !error && (
          <MeetingList
            meetings={meetings}
            onSelect={(meeting) => {
              const found = sortedRawMeetings.find((m) => m.id === meeting.id);
              setSelectedMeeting(found ?? null);
            }}
          />
        )}
      </div>

      <MeetingDetailsModal
        meeting={selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
      />
    </AppLayout>
  );
}

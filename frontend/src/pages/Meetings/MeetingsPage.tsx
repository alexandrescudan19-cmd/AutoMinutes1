import { useEffect, useState } from "react";
import {
  MeetingDetailsModal,
  MeetingList,
  StatCard,
  type Meeting,
} from "../../components/molecules";
import { AppLayout } from "../../components/templates";
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
  actionItemsCount: number;
}

interface MeetingHistoryResponse {
  items: RawMeeting[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

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
    actionItemsCount: raw.actionItemsCount ?? 0,
  };
}

export default function MeetingsPage() {
  const [rawMeetings, setRawMeetings] = useState<RawMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [selectedMeeting, setSelectedMeeting] = useState<RawMeeting | null>(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      setIsLoading(true);
      setError("");

      try {
        const { data } = await api.get<MeetingHistoryResponse>("/meetings/history", {
          params: {
            page,
            pageSize: 10,
            search: query || undefined,
            sort: "newest",
          },
        });
        setRawMeetings(data.items);
        setTotal(data.total);
        setPage(data.page);
        setPageCount(data.pageCount);
      } catch {
        setError("Nu am putut incarca sedintele. Incearca din nou.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchMeetings();
  }, [page, query]);

  const meetings = rawMeetings.map(toMeetingRowData);
  const processingCount = rawMeetings.filter((meeting) => meeting.aiStatus === "Processing").length;
  const completedCount = rawMeetings.filter((meeting) => meeting.aiStatus === "Completed").length;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>

        <div className="flex gap-4">
          <StatCard label="Total meetings" value={total} accent="gray" />
          <StatCard label="AI processing" value={processingCount} accent="amber" />
          <StatCard label="AI completed" value={completedCount} accent="green" />
        </div>

        {isLoading && <p className="text-sm text-gray-500">Se incarca...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isLoading && !error && (
          <MeetingList
            meetings={meetings}
            query={query}
            onQueryChange={(nextQuery) => {
              setQuery(nextQuery);
              setPage(1);
            }}
            onSelect={(meeting) => {
              const found = rawMeetings.find((rawMeeting) => rawMeeting.id === meeting.id);
              setSelectedMeeting(found ?? null);
            }}
          />
        )}

        {!isLoading && !error && pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
            <span>
              Pagina {page} din {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                className="h-9 rounded-lg bg-gray-100 px-3 font-medium text-gray-800 disabled:opacity-50"
              >
                Inapoi
              </button>
              <button
                type="button"
                disabled={page === pageCount}
                onClick={() => setPage((currentPage) => Math.min(pageCount, currentPage + 1))}
                className="h-9 rounded-lg bg-gray-100 px-3 font-medium text-gray-800 disabled:opacity-50"
              >
                Inainte
              </button>
            </div>
          </div>
        )}
      </div>

      <MeetingDetailsModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />
    </AppLayout>
  );
}

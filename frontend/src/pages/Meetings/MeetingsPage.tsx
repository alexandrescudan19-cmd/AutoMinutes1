import { useEffect, useMemo, useState } from "react";
import { MeetingDetailsModal, MeetingList } from "../../components/molecules";
import { MeetingsHeader } from "../../components/organisms/meeting";
import { Card, Input, Select } from "../../components/atoms";
import { AppLayout } from "../../components/templates";
import { useMeetingsStore } from "../../stores/meetingsStore";
import type { MeetingHistorySort, MeetingStatus } from "../../types";

const SORT_OPTIONS: { value: MeetingHistorySort; label: string }[] = [
  { value: "newest", label: "Cele mai noi" },
  { value: "oldest", label: "Cele mai vechi" },
  { value: "status", label: "Status" },
  { value: "title", label: "Titlu (A-Z)" },
];

const STATUS_OPTIONS: { value: MeetingStatus; label: string }[] = [
  { value: "Upcoming", label: "Upcoming" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function MeetingsPage() {
  const { meetings, total, page, pageCount, filters, isLoading, error, fetchMeetings, setPage, setFilters } =
    useMeetingsStore();

  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [onlyWithActionItems, setOnlyWithActionItems] = useState(false);

  useEffect(() => {
    void fetchMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      if (dateFrom && new Date(meeting.startDateTime) < new Date(dateFrom)) return false;
      if (dateTo && new Date(meeting.startDateTime) > new Date(dateTo)) return false;
      if (onlyWithActionItems && meeting.actionItemsCount === 0) return false;
      return true;
    });
  }, [meetings, dateFrom, dateTo, onlyWithActionItems]);

  const stats = useMemo(
    () => ({
      total,
      processing: meetings.filter((m) => m.aiStatus === "Processing").length,
      completed: meetings.filter((m) => m.aiStatus === "Completed").length,
      openActionItems: meetings.reduce((sum, m) => sum + m.actionItemsCount, 0),
    }),
    [meetings, total],
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <MeetingsHeader stats={stats} />

        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              placeholder="Toate"
              value={filters.status ?? ""}
              onChange={(e) =>
                setFilters({ status: (e.target.value || undefined) as MeetingStatus | undefined })
              }
            />
            <Select
              label="Sorteaza"
              options={SORT_OPTIONS}
              value={filters.sort}
              onChange={(e) => setFilters({ sort: e.target.value as MeetingHistorySort })}
            />
            <Input
              label="De la data"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="Pana la data"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <label className="flex h-10 items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={onlyWithActionItems}
                onChange={(e) => setOnlyWithActionItems(e.target.checked)}
                className="h-4 w-4"
              />
              Doar cu action items
            </label>
          </div>
        </Card>

        {isLoading && <p className="text-sm text-gray-500">Se incarca...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isLoading && !error && (
          <MeetingList
            meetings={visibleMeetings}
            query={filters.search}
            onQueryChange={(nextQuery) => setFilters({ search: nextQuery })}
            onSelect={(meeting) => setSelectedMeetingId(meeting.id)}
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
                onClick={() => setPage(Math.max(1, page - 1))}
                className="h-9 rounded-lg bg-gray-100 px-3 font-medium text-gray-800 disabled:opacity-50"
              >
                Inapoi
              </button>
              <button
                type="button"
                disabled={page === pageCount}
                onClick={() => setPage(Math.min(pageCount, page + 1))}
                className="h-9 rounded-lg bg-gray-100 px-3 font-medium text-gray-800 disabled:opacity-50"
              >
                Inainte
              </button>
            </div>
          </div>
        )}
      </div>

      <MeetingDetailsModal meetingId={selectedMeetingId} onClose={() => setSelectedMeetingId(null)} />
    </AppLayout>
  );
}

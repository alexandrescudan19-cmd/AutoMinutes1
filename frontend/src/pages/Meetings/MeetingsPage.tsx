import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiCalendar, FiCheckSquare, FiFilter } from "react-icons/fi";
import {
  FilterPill,
  MeetingDetailsModal,
  MeetingList,
  Pagination,
  SearchBar,
} from "../../components/molecules";
import { MeetingsHeader } from "../../components/organisms/meeting";
import { Card, Chip } from "../../components/atoms";
import { AppLayout } from "../../components/templates";
import { useMeetingsStore } from "../../stores/meetingsStore";
import type { AiStatus, MeetingHistorySort, MeetingStatus } from "../../types";

const SORT_OPTIONS: { value: MeetingHistorySort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "status", label: "Status" },
  { value: "title", label: "Title (A-Z)" },
];

const STATUS_OPTIONS: { value: MeetingStatus; label: string }[] = [
  { value: "Upcoming", label: "Upcoming" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

const AI_STATUS_OPTIONS: { value: AiStatus; label: string }[] = [
  { value: "Idle", label: "Idle" },
  { value: "Processing", label: "Processing" },
  { value: "Completed", label: "Completed" },
  { value: "Failed", label: "Failed" },
];

const STATUS_PILL_OPTIONS = [
  { value: "", label: "All" },
  ...STATUS_OPTIONS.map((o) => ({ value: o.value as string, label: o.label })),
];

const AI_STATUS_PILL_OPTIONS = [
  { value: "", label: "All" },
  ...AI_STATUS_OPTIONS.map((o) => ({
    value: o.value as string,
    label: o.label,
  })),
];

const SORT_PILL_OPTIONS = SORT_OPTIONS.map((o) => ({
  value: o.value as string,
  label: o.label,
}));
const NORMAL_PAGE_SIZE = 10;
const CLIENT_FILTER_PAGE_SIZE = 50;
const CLIENT_PAGE_SIZE = 10;

function DatePill({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.showPicker?.()}
        aria-label={`Open ${ariaLabel} picker`}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <FiCalendar aria-hidden="true" />
      </button>
      <input
        ref={inputRef}
        type="date"
        lang="en-GB"
        title="dd/mm/yyyy"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-40 rounded-full border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:[color-scheme:dark]"
      />
    </div>
  );
}

export default function MeetingsPage() {
  const {
    meetings,
    total,
    page,
    pageCount,
    stats,
    filters,
    isLoading,
    error,
    fetchMeetings,
    setPage,
    setFilters,
  } = useMeetingsStore();

  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const isFirstUrlSync = useRef(true);
  const didMountClientFilters = useRef(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [onlyWithActionItems, setOnlyWithActionItems] = useState(false);
  const [clientPage, setClientPage] = useState(1);

  const hasClientSideFilters = !!dateFrom || !!dateTo || onlyWithActionItems;

  const visibleMeetings = useMemo(
    () =>
      meetings.filter((meeting) => {
        if (dateFrom && new Date(meeting.startDateTime) < new Date(dateFrom))
          return false;
        if (dateTo && new Date(meeting.startDateTime) > new Date(dateTo))
          return false;
        if (onlyWithActionItems && meeting.actionItemsCount === 0) return false;
        return true;
      }),
    [meetings, dateFrom, dateTo, onlyWithActionItems],
  );

  const effectivePageCount = hasClientSideFilters
    ? Math.max(1, Math.ceil(visibleMeetings.length / CLIENT_PAGE_SIZE))
    : pageCount;
  const effectivePage = hasClientSideFilters
    ? Math.min(clientPage, effectivePageCount)
    : page;
  const effectiveTotal = hasClientSideFilters ? visibleMeetings.length : total;
  const displayedMeetings = hasClientSideFilters
    ? visibleMeetings.slice(
        (effectivePage - 1) * CLIENT_PAGE_SIZE,
        effectivePage * CLIENT_PAGE_SIZE,
      )
    : visibleMeetings;
  const handlePageChange = hasClientSideFilters ? setClientPage : setPage;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const search = searchParams.get("search");
      const status = searchParams.get("status") as MeetingStatus | null;
      const aiStatus = searchParams.get("aiStatus") as AiStatus | null;
      const sort = searchParams.get("sort") as MeetingHistorySort | null;
      const pageParam = searchParams.get("page");
      const initialPage =
        pageParam && Number(pageParam) > 0 ? Number(pageParam) : 1;

      const initialDateFrom = searchParams.get("dateFrom") ?? "";
      const initialDateTo = searchParams.get("dateTo") ?? "";
      const initialHasActionItems = searchParams.get("hasActionItems") === "1";
      const initialHasClientFilters =
        !!initialDateFrom || !!initialDateTo || initialHasActionItems;

      useMeetingsStore.setState((state) => ({
        filters: {
          search: search ?? state.filters.search,
          status: (status && STATUS_OPTIONS.some((o) => o.value === status)
            ? status
            : state.filters.status) as MeetingStatus | undefined,
          aiStatus: (aiStatus &&
          AI_STATUS_OPTIONS.some((o) => o.value === aiStatus)
            ? aiStatus
            : state.filters.aiStatus) as AiStatus | undefined,
          sort:
            sort && SORT_OPTIONS.some((o) => o.value === sort)
              ? sort
              : state.filters.sort,
        },
        pageSize: initialHasClientFilters
          ? CLIENT_FILTER_PAGE_SIZE
          : NORMAL_PAGE_SIZE,
        page: initialHasClientFilters ? 1 : initialPage,
      }));
      setDateFrom(initialDateFrom);
      setDateTo(initialDateTo);
      setOnlyWithActionItems(initialHasActionItems);
      if (initialHasClientFilters) setClientPage(initialPage);
      if (
        searchParams.get("status") ||
        searchParams.get("aiStatus") ||
        initialHasClientFilters
      ) {
        setIsFilterPanelOpen(true);
      }
      void fetchMeetings();
      didMountClientFilters.current = true;
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!didMountClientFilters.current) return;
    useMeetingsStore.setState({
      pageSize: hasClientSideFilters
        ? CLIENT_FILTER_PAGE_SIZE
        : NORMAL_PAGE_SIZE,
      page: 1,
    });
    setClientPage(1);
    void fetchMeetings();
  }, [hasClientSideFilters]);

  useEffect(() => {
    if (isFirstUrlSync.current) {
      isFirstUrlSync.current = false;
      return;
    }
    const next = new URLSearchParams();
    if (filters.search) next.set("search", filters.search);
    if (filters.status) next.set("status", filters.status);
    if (filters.aiStatus) next.set("aiStatus", filters.aiStatus);
    if (filters.sort && filters.sort !== "newest")
      next.set("sort", filters.sort);
    if (dateFrom) next.set("dateFrom", dateFrom);
    if (dateTo) next.set("dateTo", dateTo);
    if (onlyWithActionItems) next.set("hasActionItems", "1");
    if (effectivePage > 1) next.set("page", String(effectivePage));
    setSearchParams(next, { replace: true });
  }, [
    filters.search,
    filters.status,
    filters.aiStatus,
    filters.sort,
    dateFrom,
    dateTo,
    onlyWithActionItems,
    effectivePage,
  ]);

  const activeSecondaryCount =
    (filters.status ? 1 : 0) +
    (filters.aiStatus ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (onlyWithActionItems ? 1 : 0);

  const resetSecondaryFilters = () => {
    setFilters({ status: undefined, aiStatus: undefined });
    setDateFrom("");
    setDateTo("");
    setOnlyWithActionItems(false);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <MeetingsHeader stats={stats} />

        <Card>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SearchBar
                className="min-w-[200px] flex-1"
                value={filters.search}
                onChange={(nextQuery) => setFilters({ search: nextQuery })}
              />

              <button
                type="button"
                onClick={() => setIsFilterPanelOpen((v) => !v)}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                  isFilterPanelOpen || activeSecondaryCount > 0
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <FiFilter aria-hidden="true" />
                Filters
                {activeSecondaryCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                    {activeSecondaryCount}
                  </span>
                )}
              </button>

              <FilterPill
                label="Sort"
                value={filters.sort}
                defaultValue="newest"
                options={SORT_PILL_OPTIONS}
                width="w-56"
                onChange={(value) =>
                  setFilters({ sort: value as MeetingHistorySort })
                }
              />
            </div>

            {(activeSecondaryCount > 0 || isFilterPanelOpen) && (
              <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                {activeSecondaryCount > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {filters.status && (
                      <Chip
                        label={`Status: ${filters.status}`}
                        onRemove={() => setFilters({ status: undefined })}
                      />
                    )}
                    {filters.aiStatus && (
                      <Chip
                        label={`AI Status: ${filters.aiStatus}`}
                        onRemove={() => setFilters({ aiStatus: undefined })}
                      />
                    )}
                    {dateFrom && (
                      <Chip
                        label={`From: ${dateFrom}`}
                        onRemove={() => setDateFrom("")}
                      />
                    )}
                    {dateTo && (
                      <Chip
                        label={`To: ${dateTo}`}
                        onRemove={() => setDateTo("")}
                      />
                    )}
                    {onlyWithActionItems && (
                      <Chip
                        label="Has action items"
                        onRemove={() => setOnlyWithActionItems(false)}
                      />
                    )}
                    <button
                      type="button"
                      onClick={resetSecondaryFilters}
                      className="text-xs font-medium text-gray-400 transition-colors hover:text-brand dark:text-gray-500"
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {isFilterPanelOpen && (
                  <div className="flex flex-wrap items-center gap-2">
                    <FilterPill
                      label="Status"
                      value={filters.status ?? ""}
                      defaultValue=""
                      options={STATUS_PILL_OPTIONS}
                      width="w-48"
                      onChange={(value) =>
                        setFilters({
                          status: (value || undefined) as
                            | MeetingStatus
                            | undefined,
                        })
                      }
                    />
                    <FilterPill
                      label="AI Status"
                      value={filters.aiStatus ?? ""}
                      defaultValue=""
                      options={AI_STATUS_PILL_OPTIONS}
                      width="w-48"
                      onChange={(value) =>
                        setFilters({
                          aiStatus: (value || undefined) as
                            | AiStatus
                            | undefined,
                        })
                      }
                    />
                    <DatePill
                      value={dateFrom}
                      onChange={setDateFrom}
                      ariaLabel="From date"
                    />
                    <DatePill
                      value={dateTo}
                      onChange={setDateTo}
                      ariaLabel="To date"
                    />
                    <button
                      type="button"
                      onClick={() => setOnlyWithActionItems((v) => !v)}
                      className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                        onlyWithActionItems
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <FiCheckSquare aria-hidden="true" />
                      Has action items
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {!isLoading && !error && (
          <MeetingList
            meetings={displayedMeetings}
            query={filters.search}
            onSelect={(meeting) => setSelectedMeetingId(meeting.id)}
          />
        )}

        {!isLoading && !error && effectivePageCount > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {effectivePage} of {effectivePageCount} · {effectiveTotal}{" "}
              meetings
            </span>
            <Pagination
              page={effectivePage}
              pageCount={effectivePageCount}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      <MeetingDetailsModal
        meetingId={selectedMeetingId}
        onClose={() => setSelectedMeetingId(null)}
      />
    </AppLayout>
  );
}

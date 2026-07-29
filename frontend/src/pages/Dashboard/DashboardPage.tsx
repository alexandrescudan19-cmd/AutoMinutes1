import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiArrowRight, FiCalendar } from "react-icons/fi";
import { Card } from "../../components/atoms";
import { MeetingDetailsModal, Pagination, StatCard, StatusBadge } from "../../components/molecules";
import { AppLayout } from "../../components/templates";
import { listMeetings } from "../../services/meetings";
import { listActionItems } from "../../services/actionItems";
import { formatDate, formatDateTime } from "../../utils/date.ts";
import type { ActionItemListItem, Meeting } from "../../types";

const FAILED_PAGE_SIZE = 4;

function isOverdue(item: ActionItemListItem) {
  if (item.status === "Completed" || !item.dueDate) return false;
  const dueDate = new Date(item.dueDate);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"overview" | "ai">("overview");
  const [failedPage, setFailedPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [meetingsData, actionItemsData] = await Promise.all([
          listMeetings(),
          listActionItems(),
        ]);
        setMeetings(meetingsData);
        setActionItems(actionItemsData);
      } catch {
        setError("Couldn't load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const stats = useMemo(
    () => ({
      total: meetings.length,
      processing: meetings.filter((m) => m.aiStatus === "Processing").length,
      completed: meetings.filter((m) => m.aiStatus === "Completed").length,
      openActionItems: actionItems.filter((item) => item.status !== "Completed").length,
    }),
    [meetings, actionItems],
  );

  const upcomingMeetings = useMemo(
    () =>
      meetings
        .filter((m) => m.status === "Upcoming")
        .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
        .slice(0, 4),
    [meetings],
  );

  const urgentActionItems = useMemo(
    () =>
      actionItems
        .filter((item) => item.status !== "Completed" && item.dueDate)
        .sort((a, b) => new Date(a.dueDate ?? "").getTime() - new Date(b.dueDate ?? "").getTime())
        .slice(0, 5),
    [actionItems],
  );

  const failedMeetings = useMemo(() => meetings.filter((m) => m.aiStatus === "Failed"), [meetings]);
  const failedPageCount = Math.max(1, Math.ceil(failedMeetings.length / FAILED_PAGE_SIZE));
  const effectiveFailedPage = Math.min(failedPage, failedPageCount);
  const pagedFailedMeetings = failedMeetings.slice(
    (effectiveFailedPage - 1) * FAILED_PAGE_SIZE,
    effectiveFailedPage * FAILED_PAGE_SIZE,
  );

  const openMeeting = (id: string, tab: "overview" | "ai" = "overview") => {
    setSelectedTab(tab);
    setSelectedMeetingId(id);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>

        {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {!isLoading && !error && (
          <>
            <div className="flex flex-wrap gap-4">
              <StatCard label="Total meetings" value={stats.total} accent="blue" />
              <StatCard label="Processing" value={stats.processing} accent="amber" />
              <StatCard label="Completed" value={stats.completed} accent="green" />
              <StatCard label="Open action items" value={stats.openActionItems} accent="amber" />
            </div>

            {failedMeetings.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                  <FiAlertTriangle aria-hidden="true" />
                  AI processing failed for {failedMeetings.length} meeting
                  {failedMeetings.length > 1 ? "s" : ""}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {pagedFailedMeetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      type="button"
                      onClick={() => openMeeting(meeting.id, "ai")}
                      className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-left text-sm hover:bg-red-50 dark:border-red-900 dark:bg-gray-900 dark:hover:bg-red-950/40"
                    >
                      <span className="min-w-0 flex-1 break-words text-gray-900 dark:text-gray-100">
                        {meeting.title}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400">
                        Retry
                      </span>
                    </button>
                  ))}
                </div>
                {failedPageCount > 1 && (
                  <div className="mt-3 flex justify-center">
                    <Pagination
                      page={effectiveFailedPage}
                      pageCount={failedPageCount}
                      onPageChange={setFailedPage}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Upcoming meetings">
                {upcomingMeetings.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">You have no upcoming meetings.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {upcomingMeetings.map((meeting) => (
                      <button
                        key={meeting.id}
                        type="button"
                        onClick={() => openMeeting(meeting.id)}
                        className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        <FiCalendar className="shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">
                            {meeting.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(meeting.startDateTime)}
                          </p>
                        </div>
                        <FiArrowRight className="shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Urgent action items">
                {urgentActionItems.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nothing urgent right now.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {urgentActionItems.map((item) => {
                      const overdue = isOverdue(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openMeeting(item.meetingId)}
                          className={`flex flex-col gap-3 rounded-lg border px-3 py-2 text-left hover:bg-gray-50 sm:flex-row sm:items-start dark:hover:bg-gray-800 ${
                            overdue ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40" : "border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          {overdue && (
                            <FiAlertTriangle className="shrink-0 text-red-500 dark:text-red-400" aria-hidden="true" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.task}
                            </p>
                            <p className="break-words text-xs text-gray-500 dark:text-gray-400">{item.meetingTitle}</p>
                          </div>
                          <span
                            className={`shrink-0 text-xs ${overdue ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}
                          >
                            {formatDate(item.dueDate)}
                          </span>
                          <StatusBadge status={item.status} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>

      <MeetingDetailsModal
        meetingId={selectedMeetingId}
        initialTab={selectedTab}
        onClose={() => setSelectedMeetingId(null)}
      />
    </AppLayout>
  );
}

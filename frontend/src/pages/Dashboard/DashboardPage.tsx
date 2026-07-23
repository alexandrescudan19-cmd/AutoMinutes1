import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiArrowRight, FiCalendar } from "react-icons/fi";
import { Card } from "../../components/atoms";
import { MeetingDetailsModal, StatCard, StatusBadge } from "../../components/molecules";
import { AppLayout } from "../../components/templates";
import { listMeetings } from "../../services/meetings";
import { listActionItems } from "../../services/actionItems";
import type { ActionItemListItem, Meeting } from "../../types";

function formatMeetingDate(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("ro-RO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDueDate(raw?: string) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

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
        setError("Nu am putut incarca datele pentru dashboard.");
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

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

        {isLoading && <p className="text-sm text-gray-500">Se incarca...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isLoading && !error && (
          <>
            <div className="flex flex-wrap gap-4">
              <StatCard label="Total intalniri" value={stats.total} accent="blue" />
              <StatCard label="In procesare" value={stats.processing} accent="amber" />
              <StatCard label="Finalizate" value={stats.completed} accent="green" />
              <StatCard label="Action items deschise" value={stats.openActionItems} accent="amber" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Urmatoarele intalniri">
                {upcomingMeetings.length === 0 ? (
                  <p className="text-sm text-gray-500">Nu ai intalniri viitoare.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {upcomingMeetings.map((meeting) => (
                      <button
                        key={meeting.id}
                        type="button"
                        onClick={() => setSelectedMeetingId(meeting.id)}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <FiCalendar className="shrink-0 text-gray-400" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {meeting.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatMeetingDate(meeting.startDateTime)}
                          </p>
                        </div>
                        <FiArrowRight className="shrink-0 text-gray-300" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Action items urgente">
                {urgentActionItems.length === 0 ? (
                  <p className="text-sm text-gray-500">Nimic urgent momentan.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {urgentActionItems.map((item) => {
                      const overdue = isOverdue(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedMeetingId(item.meetingId)}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left hover:bg-gray-50 ${
                            overdue ? "border-red-200 bg-red-50" : "border-gray-200"
                          }`}
                        >
                          {overdue && (
                            <FiAlertTriangle className="shrink-0 text-red-500" aria-hidden="true" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {item.task}
                            </p>
                            <p className="truncate text-xs text-gray-500">{item.meetingTitle}</p>
                          </div>
                          <span
                            className={`shrink-0 text-xs ${overdue ? "text-red-600" : "text-gray-500"}`}
                          >
                            {formatDueDate(item.dueDate)}
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

      <MeetingDetailsModal meetingId={selectedMeetingId} onClose={() => setSelectedMeetingId(null)} />
    </AppLayout>
  );
}

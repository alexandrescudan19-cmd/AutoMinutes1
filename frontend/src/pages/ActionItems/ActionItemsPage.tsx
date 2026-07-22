import { useEffect, useMemo, useState } from "react";
import { FiCheckSquare, FiRefreshCw } from "react-icons/fi";
import { Badge, Button, Card } from "../../components/atoms";
import { AppLayout } from "../../components/templates";
import { api } from "../../services/api";

interface ActionItem {
  id: string;
  aiResultId?: string;
  meetingId: string;
  meetingTitle: string;
  task: string;
  responsiblePerson: string;
  dueDate?: string;
  status: "Pending" | "In Progress" | "Completed" | string;
  confidenceScore?: number;
}

type StatusFilter = "all" | "Pending" | "In Progress" | "Completed";

const STATUS_GROUPS = [
  { key: "In Progress", label: "IN PROGRESS" },
  { key: "Pending", label: "OPEN" },
  { key: "Unknown", label: "UNKNOWN" },
  { key: "Completed", label: "DONE" },
];

function formatDate(raw?: string) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getGroupKey(status: string) {
  if (status === "Pending" || status === "In Progress" || status === "Completed") {
    return status;
  }

  return "Unknown";
}

function statusVariant(status: string) {
  if (status === "Completed") return "success" as const;
  if (status === "In Progress") return "warning" as const;
  if (status === "Pending") return "info" as const;
  return "neutral" as const;
}

export default function ActionItemsPage() {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const assignees = useMemo(
    () =>
      Array.from(
        new Set(
          actionItems.map((item) => item.responsiblePerson || "Unassigned").filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [actionItems],
  );

  const visibleActionItems = useMemo(
    () =>
      actionItems.filter((item) => {
        const statusMatches = statusFilter === "all" || item.status === statusFilter;
        const assigneeMatches =
          assigneeFilter === "all" || item.responsiblePerson === assigneeFilter;
        return statusMatches && assigneeMatches;
      }),
    [actionItems, assigneeFilter, statusFilter],
  );

  const groupedActionItems = useMemo(
    () =>
      STATUS_GROUPS.map((group) => ({
        ...group,
        items: visibleActionItems.filter((item) => getGroupKey(item.status) === group.key),
      })),
    [visibleActionItems],
  );

  const loadActionItems = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { data } = await api.get<ActionItem[]>("/ai/action-items");
      setActionItems(data);
    } catch {
      setError("Nu am putut incarca action items.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadActionItems();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <AppLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Action Items</h1>
            <p className="text-sm text-gray-500">
              {visibleActionItems.length} items across all meetings
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            leftIcon={<FiRefreshCw />}
            isLoading={isLoading}
            onClick={loadActionItems}
          >
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="In Progress">In progress</option>
            <option value="Pending">Open</option>
            <option value="Completed">Done</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="all">All assignees</option>
            {assignees.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Card>
          {isLoading ? (
            <p className="text-sm text-gray-500">Se incarca...</p>
          ) : visibleActionItems.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 text-gray-500">
              <FiCheckSquare />
              <p className="text-sm">Nu exista action items pentru filtrele curente.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {groupedActionItems
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <section key={group.key} className="grid gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {group.label} <span className="text-gray-400">{group.items.length}</span>
                    </h2>
                    <div className="grid gap-2">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-[auto_minmax(0,1fr)_160px_150px_120px]"
                        >
                          <input
                            type="checkbox"
                            checked={item.status === "Completed"}
                            readOnly
                            className="mt-1 h-4 w-4"
                            aria-label={item.task}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {item.task}
                            </p>
                            <p className="truncate text-xs text-gray-500">{item.meetingTitle}</p>
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            {item.responsiblePerson || "Unassigned"}
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            {formatDate(item.dueDate) || "No due date"}
                          </div>
                          <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

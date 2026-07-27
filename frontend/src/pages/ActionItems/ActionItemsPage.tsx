import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { Button, Card } from "../../components/atoms";
import { FilterPill } from "../../components/molecules";
import { ActionItemList } from "../../components/organisms/action-item";
import { AppLayout } from "../../components/templates";
import { listActionItems } from "../../services/actionItems";
import type { ActionItemListItem, ActionItemStatus } from "../../types";

type StatusFilter = "all" | ActionItemStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "In Progress", label: "In progress" },
  { value: "Pending", label: "Open" },
  { value: "Completed", label: "Done" },
];

export default function ActionItemsPage() {
  const [actionItems, setActionItems] = useState<ActionItemListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const assignees = useMemo(
    () =>
      Array.from(
        new Set(actionItems.map((item) => item.responsiblePerson || "Unassigned").filter(Boolean)),
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

  const hasActiveFilters = statusFilter !== "all" || assigneeFilter !== "all";

  const loadActionItems = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await listActionItems();
      setActionItems(data);
    } catch {
      setError("Couldn't load action items.");
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
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Action Items</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {visibleActionItems.length} items across all meetings
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            leftIcon={<FiRefreshCw />}
            isLoading={isLoading}
            onClick={() => void loadActionItems()}
          >
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            label="Status"
            value={statusFilter}
            defaultValue="all"
            options={STATUS_OPTIONS}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
          />
          <FilterPill
            label="Assignee"
            value={assigneeFilter}
            defaultValue="all"
            options={[
              { value: "all", label: "All assignees" },
              ...assignees.map((assignee) => ({ value: assignee, label: assignee })),
            ]}
            width="w-56"
            onChange={setAssigneeFilter}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setAssigneeFilter("all");
              }}
              className="text-sm font-medium text-gray-400 transition-colors hover:text-brand dark:text-gray-500"
            >
              Reset
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Card>
          {isLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          ) : (
            <ActionItemList
              items={visibleActionItems}
              showMeetingTitle
              onChanged={() => void loadActionItems()}
            />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

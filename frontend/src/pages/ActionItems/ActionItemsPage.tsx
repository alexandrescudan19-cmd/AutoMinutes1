import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { Button, Card, Select } from "../../components/atoms";
import { ActionItemList } from "../../components/organisms/action-item";
import { AppLayout } from "../../components/templates";
import { listActionItems } from "../../services/actionItems";
import type { ActionItemListItem, ActionItemStatus } from "../../types";

type StatusFilter = "all" | ActionItemStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Toate statusurile" },
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

  const loadActionItems = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await listActionItems();
      setActionItems(data);
    } catch {
      setError("Nu am putut incarca action items.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadActionItems();
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
            onClick={() => void loadActionItems()}
          >
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          />
          <Select
            options={[
              { value: "all", label: "Toti responsabilii" },
              ...assignees.map((assignee) => ({ value: assignee, label: assignee })),
            ]}
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Card>
          {isLoading ? (
            <p className="text-sm text-gray-500">Se incarca...</p>
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

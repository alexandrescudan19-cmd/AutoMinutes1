import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";
import { Button, Card, Input, Select } from "../../components/atoms";
import { FilterPill, Pagination } from "../../components/molecules";
import { ActionItemList } from "../../components/organisms/action-item";
import { AppLayout } from "../../components/templates";
import { createActionItem, listActionItems } from "../../services/actionItems";
import { listMeetings } from "../../services/meetings";
import type { ActionItemListItem, ActionItemStatus, Meeting } from "../../types";

type CardKey = "all" | ActionItemStatus;

const CARD_GROUPS: { key: CardKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "In Progress", label: "In Progress" },
  { key: "Pending", label: "Open" },
  { key: "Completed", label: "Done" },
];

const PAGE_SIZE = 10;

function readCardFromParams(searchParams: URLSearchParams): CardKey {
  const card = searchParams.get("card");
  if (card === "In Progress" || card === "Pending" || card === "Completed") return card;
  return "all";
}

export default function ActionItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [actionItems, setActionItems] = useState<ActionItemListItem[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState(() => searchParams.get("assignee") ?? "all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCard, setActiveCard] = useState<CardKey>(() => readCardFromParams(searchParams));
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [newMeetingId, setNewMeetingId] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newResponsiblePerson, setNewResponsiblePerson] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newStatus, setNewStatus] = useState<ActionItemStatus>("Pending");
  const [isCreating, setIsCreating] = useState(false);
  const [page, setPage] = useState(() => {
    const fromUrl = Number(searchParams.get("page"));
    return fromUrl > 0 ? fromUrl : 1;
  });

  const assignees = useMemo(
    () =>
      Array.from(
        new Set(actionItems.map((item) => item.responsiblePerson || "Unassigned").filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right)),
    [actionItems],
  );

  const visibleActionItems = useMemo(
    () =>
      actionItems.filter(
        (item) => assigneeFilter === "all" || item.responsiblePerson === assigneeFilter,
      ),
    [actionItems, assigneeFilter],
  );

  const cards = useMemo(
    () =>
      CARD_GROUPS.map((group) => ({
        ...group,
        items:
          group.key === "all"
            ? visibleActionItems
            : visibleActionItems.filter((item) => item.status === group.key),
      })),
    [visibleActionItems],
  );

  const activeGroup = cards.find((group) => group.key === activeCard) ?? null;
  const pageCount = activeGroup ? Math.max(1, Math.ceil(activeGroup.items.length / PAGE_SIZE)) : 1;
  const effectivePage = Math.min(page, pageCount);
  const pagedItems = activeGroup
    ? activeGroup.items.slice((effectivePage - 1) * PAGE_SIZE, effectivePage * PAGE_SIZE)
    : [];

  const hasActiveFilters = assigneeFilter !== "all";

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

  const loadMeetings = async () => {
    try {
      const data = await listMeetings();
      setMeetings(data);
      setNewMeetingId((current) => current || data[0]?.id || "");
    } catch {
      toast.error("Couldn't load meetings.");
    }
  };

  const saveNewActionItem = async () => {
    if (!newMeetingId || !newTask.trim() || !newResponsiblePerson.trim()) return;
    setIsCreating(true);
    try {
      await createActionItem({
        meetingId: newMeetingId,
        task: newTask.trim(),
        responsiblePerson: newResponsiblePerson.trim(),
        dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        status: newStatus,
      });
      toast.success("Action item added.");
      setNewTask("");
      setNewResponsiblePerson("");
      setNewDueDate("");
      setNewStatus("Pending");
      await loadActionItems();
    } catch {
      toast.error("Couldn't add the action item.");
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadActionItems();
      void loadMeetings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    if (activeCard !== "all") next.set("card", activeCard);
    if (assigneeFilter !== "all") next.set("assignee", assigneeFilter);
    if (effectivePage > 1) next.set("page", String(effectivePage));
    setSearchParams(next, { replace: true });
  }, [activeCard, assigneeFilter, effectivePage, setSearchParams]);

  const selectCard = (key: CardKey) => {
    setActiveCard(key);
    setPage(1);
  };

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
          <div className="flex flex-wrap items-center gap-2">
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
                onClick={() => setAssigneeFilter("all")}
                className="text-sm font-medium text-gray-400 transition-colors hover:text-brand dark:text-gray-500"
              >
                Reset
              </button>
            )}
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
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Card title="Add action item">
          <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,2fr)_minmax(160px,1fr)_150px_150px] lg:items-end">
            <Select
              label="Meeting"
              value={newMeetingId}
              options={meetings.map((meeting) => ({
                value: meeting.id,
                label: meeting.title,
              }))}
              onChange={(event) => setNewMeetingId(event.target.value)}
            />
            <Input
              label="Task"
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
            />
            <Input
              label="Assignee"
              value={newResponsiblePerson}
              onChange={(event) => setNewResponsiblePerson(event.target.value)}
            />
            <Input
              label="Due date"
              type="date"
              value={newDueDate}
              onChange={(event) => setNewDueDate(event.target.value)}
            />
            <Select
              label="Status"
              value={newStatus}
              options={[
                { value: "Pending", label: "Pending" },
                { value: "In Progress", label: "In Progress" },
                { value: "Completed", label: "Completed" },
              ]}
              onChange={(event) => setNewStatus(event.target.value as ActionItemStatus)}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              leftIcon={<FiPlus />}
              isLoading={isCreating}
              disabled={!newMeetingId || !newTask.trim() || !newResponsiblePerson.trim()}
              onClick={() => void saveNewActionItem()}
            >
              Add action item
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cards.map((group) => {
            const isActive = activeCard === group.key;
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => selectCard(group.key)}
                className={`rounded-xl border p-5 text-left transition-colors ${
                  isActive
                    ? "border-brand bg-brand/5 dark:bg-brand/10"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                }`}
              >
                <p className={`text-2xl font-semibold ${isActive ? "text-brand" : "text-gray-900 dark:text-gray-100"}`}>
                  {group.items.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{group.label}</p>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <Card>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          </Card>
        ) : (
          activeGroup && (
            <Card>
              <ActionItemList
                items={pagedItems}
                showMeetingTitle
                onChanged={() => void loadActionItems()}
              />
              {pageCount > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination page={effectivePage} pageCount={pageCount} onPageChange={setPage} />
                </div>
              )}
            </Card>
          )
        )}
      </div>
    </AppLayout>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiRefreshCw } from "react-icons/fi";
import { Button, Card } from "../../components/atoms";
import { FilterPill, Pagination } from "../../components/molecules";
import { ActionItemList } from "../../components/organisms/action-item";
import { AppLayout } from "../../components/templates";
import { listActionItems } from "../../services/actionItems";
import type { ActionItemListItem, ActionItemStatus } from "../../types";

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadActionItems();
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

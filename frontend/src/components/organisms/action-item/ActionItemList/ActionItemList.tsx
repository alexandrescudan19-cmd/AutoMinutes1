import { useMemo, useState } from "react";
import { FiAlertTriangle, FiCheckSquare, FiEdit2, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import { Button, Input, Select } from "../../../atoms";
import { ConfirmDialog, EditActions, EmptyState, StatusBadge } from "../../../molecules/common";
import { deleteActionItem, updateActionItem } from "../../../../services/actionItems";
import { formatDate, toDateInputValue } from "../../../../utils/date.ts";
import type { ActionItem, ActionItemListItem, ActionItemStatus } from "../../../../types";

export interface ActionItemListProps {
  items: (ActionItem | ActionItemListItem)[];
  showMeetingTitle?: boolean;
  onChanged: () => void;
  onOpenMeeting?: (meetingId: string) => void;
}

const STATUS_GROUPS: { key: ActionItemStatus | "Unknown"; label: string }[] = [
  { key: "In Progress", label: "IN PROGRESS" },
  { key: "Pending", label: "OPEN" },
  { key: "Unknown", label: "UNKNOWN" },
  { key: "Completed", label: "DONE" },
];

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
];

function hasMeetingTitle(item: ActionItem | ActionItemListItem): item is ActionItemListItem {
  return "meetingTitle" in item;
}

function getGroupKey(status: string): ActionItemStatus | "Unknown" {
  if (status === "Pending" || status === "In Progress" || status === "Completed") {
    return status;
  }
  return "Unknown";
}

function isOverdue(item: ActionItem) {
  if (item.status === "Completed" || !item.dueDate) return false;
  const dueDate = new Date(item.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;
  return dueDate.getTime() < Date.now();
}

export default function ActionItemList({
  items,
  showMeetingTitle = false,
  onChanged,
  onOpenMeeting,
}: ActionItemListProps) {
  const [editingId, setEditingId] = useState("");
  const [editTask, setEditTask] = useState("");
  const [editResponsiblePerson, setEditResponsiblePerson] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState<ActionItemStatus>("Pending");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyToggleId, setBusyToggleId] = useState("");

  const groupedItems = useMemo(
    () =>
      // Grupeaza taskurile dupa status.
      STATUS_GROUPS.map((group) => ({
        ...group,
        items: items.filter((item) => getGroupKey(item.status) === group.key),
      })).filter((group) => group.items.length > 0),
    [items],
  );

  const startEditing = (item: ActionItem) => {
    // Pregateste formularul de editare.
    setEditingId(item.id);
    setEditTask(item.task);
    setEditResponsiblePerson(item.responsiblePerson);
    setEditDueDate(toDateInputValue(item.dueDate));
    setEditStatus(item.status);
  };

  const cancelEditing = () => setEditingId("");

  const saveEditing = async () => {
    // Salveaza modificarile taskului.
    if (!editTask.trim() || !editResponsiblePerson.trim()) return;
    setIsSaving(true);
    try {
      await updateActionItem(editingId, {
        task: editTask.trim(),
        responsiblePerson: editResponsiblePerson.trim(),
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined,
        status: editStatus,
      });
      toast.success("Action item updated.");
      setEditingId("");
      onChanged();
    } catch {
      toast.error("Couldn't update the action item.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: ActionItem) => {
    // Comuta rapid statusul taskului.
    setBusyToggleId(item.id);
    try {
      await updateActionItem(item.id, {
        status: item.status === "Completed" ? "Pending" : "Completed",
      });
      onChanged();
    } catch {
      toast.error("Couldn't update the status.");
    } finally {
      setBusyToggleId("");
    }
  };

  const confirmDelete = async () => {
    // Sterge taskul confirmat.
    setIsDeleting(true);
    try {
      await deleteActionItem(pendingDeleteId);
      toast.success("Action item deleted.");
      setPendingDeleteId("");
      onChanged();
    } catch {
      toast.error("Couldn't delete the action item.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FiCheckSquare />}
        title="No action items match the current filters."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groupedItems.map((group) => (
        <section key={group.key} className="grid gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {group.label} <span className="text-gray-400 dark:text-gray-500">{group.items.length}</span>
          </h2>
          <div className="grid gap-2">
            {group.items.map((item) => {
              if (editingId === item.id) {
                return (
                  <div
                    key={item.id}
                    className="grid gap-2 rounded-lg border border-brand/40 bg-brand/5 p-3 dark:bg-brand/10"
                  >
                    <Input
                      label="Task"
                      value={editTask}
                      onChange={(e) => setEditTask(e.target.value)}
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input
                        label="Assignee"
                        value={editResponsiblePerson}
                        onChange={(e) => setEditResponsiblePerson(e.target.value)}
                      />
                      <Input
                        label="Due date"
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                      />
                      <Select
                        label="Status"
                        options={STATUS_OPTIONS}
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as ActionItemStatus)}
                      />
                    </div>
                    <EditActions
                      onCancel={cancelEditing}
                      onConfirm={() => void saveEditing()}
                      isLoading={isSaving}
                    />
                  </div>
                );
              }

              const overdue = isOverdue(item);

              return (
                <div
                  key={item.id}
                  className={`grid min-w-0 gap-3 rounded-lg border bg-white p-3 lg:grid-cols-[auto_minmax(0,1fr)_160px_150px_120px_auto] lg:items-center dark:bg-gray-900 ${
                    overdue ? "border-red-400 dark:border-red-700" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.status === "Completed"}
                    disabled={busyToggleId === item.id}
                    onChange={() => void toggleStatus(item)}
                    className="mt-1 h-4 w-4 cursor-pointer"
                    aria-label={item.task}
                  />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium leading-5 text-gray-900 dark:text-gray-100">{item.task}</p>
                    {showMeetingTitle && hasMeetingTitle(item) && (
                      <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">{item.meetingTitle}</p>
                    )}
                  </div>
                  <div className="min-w-0 break-words rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {item.responsiblePerson || "Unassigned"}
                  </div>
                  <div
                    className={`flex min-w-0 items-center gap-1 rounded-lg border px-3 py-2 text-sm ${
                      overdue
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                        : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {overdue && <FiAlertTriangle className="shrink-0" aria-hidden="true" />}
                    {formatDate(item.dueDate) || "No due date"}
                  </div>
                  <StatusBadge status={item.status} />
                  <div className="flex flex-wrap gap-1">
                    {showMeetingTitle && hasMeetingTitle(item) && onOpenMeeting && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenMeeting(item.meetingId)}
                      >
                        Open
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      aria-label="Edit"
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(item.id)}
                      aria-label="Delete"
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <ConfirmDialog
        isOpen={!!pendingDeleteId}
        message="Are you sure you want to delete this action item?"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDeleteId("")}
      />
    </div>
  );
}

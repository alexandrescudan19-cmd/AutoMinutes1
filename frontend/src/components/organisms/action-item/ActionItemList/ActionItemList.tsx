import { useMemo, useState } from "react";
import { FiAlertTriangle, FiCheckSquare, FiEdit2, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import { Badge, Button, Input, Select } from "../../../atoms";
import { ConfirmDialog } from "../../../molecules/common";
import { deleteActionItem, updateActionItem } from "../../../../services/actionItems";
import type { ActionItem, ActionItemListItem, ActionItemStatus } from "../../../../types";

export interface ActionItemListProps {
  items: (ActionItem | ActionItemListItem)[];
  showMeetingTitle?: boolean;
  onChanged: () => void;
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

function formatDate(raw?: string) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toDateInputValue(raw?: string) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
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

function statusVariant(status: string) {
  if (status === "Completed") return "success" as const;
  if (status === "In Progress") return "warning" as const;
  if (status === "Pending") return "info" as const;
  return "neutral" as const;
}

export default function ActionItemList({
  items,
  showMeetingTitle = false,
  onChanged,
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
      STATUS_GROUPS.map((group) => ({
        ...group,
        items: items.filter((item) => getGroupKey(item.status) === group.key),
      })).filter((group) => group.items.length > 0),
    [items],
  );

  const startEditing = (item: ActionItem) => {
    setEditingId(item.id);
    setEditTask(item.task);
    setEditResponsiblePerson(item.responsiblePerson);
    setEditDueDate(toDateInputValue(item.dueDate));
    setEditStatus(item.status);
  };

  const cancelEditing = () => setEditingId("");

  const saveEditing = async () => {
    if (!editTask.trim() || !editResponsiblePerson.trim()) return;
    setIsSaving(true);
    try {
      await updateActionItem(editingId, {
        task: editTask.trim(),
        responsiblePerson: editResponsiblePerson.trim(),
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined,
        status: editStatus,
      });
      toast.success("Action item actualizat.");
      setEditingId("");
      onChanged();
    } catch {
      toast.error("Nu am putut actualiza action item-ul.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: ActionItem) => {
    setBusyToggleId(item.id);
    try {
      await updateActionItem(item.id, {
        status: item.status === "Completed" ? "Pending" : "Completed",
      });
      onChanged();
    } catch {
      toast.error("Nu am putut actualiza statusul.");
    } finally {
      setBusyToggleId("");
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteActionItem(pendingDeleteId);
      toast.success("Action item sters.");
      setPendingDeleteId("");
      onChanged();
    } catch {
      toast.error("Nu am putut sterge action item-ul.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 text-gray-500">
        <FiCheckSquare />
        <p className="text-sm">Nu exista action items pentru filtrele curente.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groupedItems.map((group) => (
        <section key={group.key} className="grid gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {group.label} <span className="text-gray-400">{group.items.length}</span>
          </h2>
          <div className="grid gap-2">
            {group.items.map((item) => {
              if (editingId === item.id) {
                return (
                  <div
                    key={item.id}
                    className="grid gap-2 rounded-lg border border-brand/40 bg-brand/5 p-3"
                  >
                    <Input
                      label="Task"
                      value={editTask}
                      onChange={(e) => setEditTask(e.target.value)}
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input
                        label="Responsabil"
                        value={editResponsiblePerson}
                        onChange={(e) => setEditResponsiblePerson(e.target.value)}
                      />
                      <Input
                        label="Termen"
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
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={cancelEditing}
                        disabled={isSaving}
                      >
                        Anuleaza
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        isLoading={isSaving}
                        onClick={() => void saveEditing()}
                      >
                        Salveaza
                      </Button>
                    </div>
                  </div>
                );
              }

              const overdue = isOverdue(item);

              return (
                <div
                  key={item.id}
                  className={`grid items-center gap-3 rounded-lg border bg-white p-3 md:grid-cols-[auto_minmax(0,1fr)_160px_150px_120px_auto] ${
                    overdue ? "border-l-4 border-red-300 border-l-red-500" : "border-gray-200"
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
                    <p className="truncate text-sm font-medium text-gray-900">{item.task}</p>
                    {showMeetingTitle && hasMeetingTitle(item) && (
                      <p className="truncate text-xs text-gray-500">{item.meetingTitle}</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {item.responsiblePerson || "Unassigned"}
                  </div>
                  <div
                    className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm ${
                      overdue
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-gray-200 bg-gray-50 text-gray-700"
                    }`}
                  >
                    {overdue && <FiAlertTriangle className="shrink-0" aria-hidden="true" />}
                    {formatDate(item.dueDate) || "No due date"}
                  </div>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      aria-label="Editeaza"
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(item.id)}
                      aria-label="Sterge"
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
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
        message="Sigur vrei sa stergi acest action item?"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDeleteId("")}
      />
    </div>
  );
}

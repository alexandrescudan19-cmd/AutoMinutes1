import { useEffect, useMemo, useState } from "react";
import { FiTrash2, FiUserCheck, FiUsers } from "react-icons/fi";
import { Button, Chip, Input, Loader, Select } from "../../../atoms";
import { ConfirmDialog, Modal, SearchBar } from "../../../molecules/common";
import { api } from "../../../../services/api";
import { deleteAttendee } from "../../../../services/attendees.ts";
import { ATTENDEE_ROLE_OPTIONS, DEFAULT_ATTENDEE_ROLE } from "../../../../utils/attendeeRoles.ts";
import { useAuth } from "../../../../hooks/useAuth.ts";

export interface Attendee {
  id: string;
  name: string;
  email?: string;
  roleInMeeting: string;
  attendanceStatus: string;
}

export interface AttendeeSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  requireEmail?: boolean;
}

export default function AttendeeSelector({
  selectedIds,
  onChange,
  requireEmail = false,
}: AttendeeSelectorProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState(DEFAULT_ATTENDEE_ROLE);

  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const { user: currentUser } = useAuth();

  useEffect(() => {
    const fetchAttendees = async () => {
      try {
        const { data } = await api.get<Attendee[]>("/attendees");
        setAttendees(data);
      } catch {
        setError("Couldn't load attendees.");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchAttendees();
  }, []);

  const selectedAttendees = useMemo(
    () => selectedIds.map((id) => attendees.find((a) => a.id === id)).filter((a): a is Attendee => !!a),
    [attendees, selectedIds],
  );

  const availableAttendees = useMemo(
    () =>
      attendees.filter(
        (a) => !selectedIds.includes(a.id) && a.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [attendees, selectedIds, query],
  );

  const findSelectionConflict = (candidate: { email?: string; roleInMeeting: string }): string => {
    const email = candidate.email?.trim().toLowerCase();
    if (email && currentUser?.email?.toLowerCase() === email) {
      return "That's your own email - you're already added as the organizer.";
    }
    if (email && selectedAttendees.some((a) => a.email?.toLowerCase() === email)) {
      return "This email is already added to this meeting.";
    }
    if (
      candidate.roleInMeeting === "Organizer" &&
      selectedAttendees.some((a) => a.roleInMeeting === "Organizer")
    ) {
      return "This meeting already has an organizer.";
    }
    return "";
  };

  const select = (id: string) => {
    const candidate = attendees.find((a) => a.id === id);
    const conflict = candidate && findSelectionConflict(candidate);
    if (conflict) {
      setError(conflict);
      return;
    }
    onChange([...selectedIds, id]);
  };

  const deselect = (id: string) => onChange(selectedIds.filter((sid) => sid !== id));

  const handleAddAttendee = async () => {
    if (!newName.trim()) return;
    if (requireEmail && !newEmail.trim()) {
      setError("Email is required for upcoming meetings.");
      return;
    }
    const conflict = findSelectionConflict({ email: newEmail, roleInMeeting: newRole.trim() });
    if (conflict) {
      setError(conflict);
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      const { data } = await api.post<Attendee>("/attendees", {
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        roleInMeeting: newRole.trim(),
      });
      setAttendees((prev) => [...prev, data]);
      onChange([...selectedIds, data.id]);
      setNewName("");
      setNewEmail("");
      setNewRole(DEFAULT_ATTENDEE_ROLE);
    } catch {
      setError("Couldn't add attendee.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAttendee(pendingDeleteId);
      setAttendees((prev) => prev.filter((a) => a.id !== pendingDeleteId));
      onChange(selectedIds.filter((id) => id !== pendingDeleteId));
      setPendingDeleteId("");
    } catch {
      setError("Couldn't delete attendee.");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const ids = attendees.map((a) => a.id);
      const results = await Promise.allSettled(ids.map((id) => deleteAttendee(id)));
      const deletedIds = new Set(ids.filter((_, index) => results[index].status === "fulfilled"));
      setAttendees((prev) => prev.filter((a) => !deletedIds.has(a.id)));
      onChange(selectedIds.filter((id) => !deletedIds.has(id)));
      if (results.some((result) => result.status === "rejected")) {
        setError("Some attendees couldn't be deleted.");
      }
      setIsDeleteAllOpen(false);
    } finally {
      setIsDeletingAll(false);
    }
  };

  if (isLoading) return <Loader size="sm" label="Loading attendees…" />;

  return (
    <div className="flex flex-col gap-3">
      <p className="min-h-[1rem] text-xs text-red-600 dark:text-red-400">{error}</p>

      {selectedAttendees.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedAttendees.map((a) => (
            <Chip key={a.id} label={a.name} onRemove={() => deselect(a.id)} removeLabel={`Unselect ${a.name}`} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <div className="grid gap-2 sm:grid-cols-3">
          <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input
            placeholder={requireEmail ? "Email" : "Email (optional)"}
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Select options={ATTENDEE_ROLE_OPTIONS} value={newRole} onChange={(e) => setNewRole(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button type="button" size="sm" isLoading={isSaving} onClick={() => void handleAddAttendee()}>
            Add attendee
          </Button>
        </div>
      </div>

      {attendees.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<FiUsers aria-hidden="true" />}
          onClick={() => setIsBrowseOpen(true)}
        >
          Choose from saved ({attendees.length})
        </Button>
      )}

      <Modal isOpen={isBrowseOpen} onClose={() => setIsBrowseOpen(false)} title="Your attendees" size="sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <SearchBar
              className="flex-1"
              value={query}
              onChange={setQuery}
              placeholder="Search attendees…"
            />
            {attendees.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<FiTrash2 aria-hidden="true" />}
                onClick={() => setIsDeleteAllOpen(true)}
              >
                Delete all
              </Button>
            )}
          </div>
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {availableAttendees.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-gray-400 dark:text-gray-500">
                {query ? "No matches." : "All attendees are selected."}
              </p>
            ) : (
              availableAttendees.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <button
                    type="button"
                    onClick={() => select(a.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                  >
                    <FiUserCheck className="shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-gray-100">{a.name}</span>
                    <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{a.roleInMeeting}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(a.id)}
                    aria-label="Delete from saved list"
                    className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingDeleteId}
        message="Permanently delete this attendee from the saved list? They'll also disappear from meetings that already use them."
        variant="danger"
        isLoading={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDeleteId("")}
      />

      <ConfirmDialog
        isOpen={isDeleteAllOpen}
        title="Delete all saved attendees?"
        message={`Permanently delete all ${attendees.length} saved attendees? They'll also disappear from meetings that already use them.`}
        variant="danger"
        isLoading={isDeletingAll}
        onConfirm={() => void confirmDeleteAll()}
        onCancel={() => setIsDeleteAllOpen(false)}
      />
    </div>
  );
}

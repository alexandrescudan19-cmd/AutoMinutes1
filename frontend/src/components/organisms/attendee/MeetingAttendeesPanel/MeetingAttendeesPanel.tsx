import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2, FiUserCheck } from "react-icons/fi";
import toast from "react-hot-toast";
import { Button, Input, Loader, Select } from "../../../atoms";
import { ConfirmDialog, EditActions } from "../../../molecules/common";
import { addMeetingInvitations, removeMeetingAttendee } from "../../../../services/meetings";
import { getAttendee, updateAttendee } from "../../../../services/attendees";
import { ATTENDEE_ROLE_OPTIONS, DEFAULT_ATTENDEE_ROLE } from "../../../../utils/attendeeRoles.ts";
import type { Attendee, Meeting } from "../../../../types";

export interface MeetingAttendeesPanelProps {
  meeting: Meeting;
  onChanged: () => void;
}

export default function MeetingAttendeesPanel({ meeting, onChanged }: MeetingAttendeesPanelProps) {
  // Meetings in the future need a real way to be invited (calendar/email), so require
  // an email there; past meetings are just kept for the record, so email is optional.
  const [now] = useState(() => Date.now());
  const isFutureMeeting = new Date(meeting.startDateTime).getTime() > now;

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState(DEFAULT_ATTENDEE_ROLE);
  const [isSaving, setIsSaving] = useState(false);

  const [pendingRemoveId, setPendingRemoveId] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState(DEFAULT_ATTENDEE_ROLE);
  const [isAddingSaving, setIsAddingSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const results = await Promise.allSettled(meeting.attendeeIds.map((id) => getAttendee(id)));
        const loaded = results
          .filter((result): result is PromiseFulfilledResult<Attendee> => result.status === "fulfilled")
          .map((result) => result.value);
        if (!cancelled) setAttendees(loaded);
      } catch {
        if (!cancelled) setError("Couldn't load attendees.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [meeting.attendeeIds]);

  const sortedAttendees = useMemo(
    () =>
      [...attendees].sort((a, b) => {
        const aRank = a.roleInMeeting === "Organizer" ? 0 : 1;
        const bRank = b.roleInMeeting === "Organizer" ? 0 : 1;
        return aRank - bRank;
      }),
    [attendees],
  );

  const findConflict = (
    candidate: { email?: string; roleInMeeting: string },
    excludeId?: string,
  ): string => {
    const others = attendees.filter((a) => a.id !== excludeId);
    const email = candidate.email?.trim().toLowerCase();
    if (email && others.some((a) => a.email?.toLowerCase() === email)) {
      return "This email is already added to this meeting.";
    }
    if (candidate.roleInMeeting === "Organizer" && others.some((a) => a.roleInMeeting === "Organizer")) {
      return "This meeting already has an organizer.";
    }
    return "";
  };

  const startEditing = (attendee: Attendee) => {
    setEditingId(attendee.id);
    setEditName(attendee.name);
    setEditEmail(attendee.email ?? "");
    setEditRole(attendee.roleInMeeting || DEFAULT_ATTENDEE_ROLE);
  };

  const saveEditing = async () => {
    if (!editName.trim()) return;
    if (isFutureMeeting && !editEmail.trim()) {
      toast.error("Email is required for upcoming meetings.");
      return;
    }
    const conflict = findConflict({ email: editEmail, roleInMeeting: editRole.trim() }, editingId);
    if (conflict) {
      toast.error(conflict);
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateAttendee(editingId, {
        name: editName.trim(),
        email: editEmail.trim() || undefined,
        roleInMeeting: editRole.trim(),
      });
      setAttendees((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success("Attendee updated.");
      setEditingId("");
    } catch {
      toast.error("Couldn't update attendee.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmRemove = async () => {
    setIsRemoving(true);
    try {
      await removeMeetingAttendee(meeting.id, pendingRemoveId);
      toast.success("Attendee removed.");
      setPendingRemoveId("");
      onChanged();
    } catch {
      toast.error("Couldn't remove attendee.");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleAddAttendee = async () => {
    if (!newName.trim()) return;
    if (isFutureMeeting && !newEmail.trim()) {
      toast.error("Email is required for upcoming meetings.");
      return;
    }
    const conflict = findConflict({ email: newEmail, roleInMeeting: newRole.trim() });
    if (conflict) {
      toast.error(conflict);
      return;
    }
    setIsAddingSaving(true);
    try {
      await addMeetingInvitations(meeting.id, [
        {
          name: newName.trim(),
          email: newEmail.trim() || undefined,
          roleInMeeting: newRole.trim() || undefined,
        },
      ]);
      toast.success("Attendee added.");
      setNewName("");
      setNewEmail("");
      setNewRole(DEFAULT_ATTENDEE_ROLE);
      setIsAdding(false);
      onChanged();
    } catch {
      toast.error("Couldn't add attendee.");
    } finally {
      setIsAddingSaving(false);
    }
  };

  if (isLoading) return <Loader size="sm" label="Loading attendees..." />;

  return (
    <div className="flex flex-col gap-3">
      <p className="min-h-[1.25rem] text-sm text-red-600 dark:text-red-400">{error}</p>

      {attendees.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No attendees yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {sortedAttendees.map((attendee) =>
          editingId === attendee.id ? (
            <div
              key={attendee.id}
              className="flex flex-col gap-2 rounded-lg border border-brand/40 bg-brand/5 p-3 dark:bg-brand/10"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <Input
                  placeholder={isFutureMeeting ? "Email" : "Email (optional)"}
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
                <Select
                  options={ATTENDEE_ROLE_OPTIONS}
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                />
              </div>
              <EditActions
                onCancel={() => setEditingId("")}
                onConfirm={() => void saveEditing()}
                isLoading={isSaving}
              />
            </div>
          ) : (
            <div
              key={attendee.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
            >
              <FiUserCheck className="shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{attendee.name}</p>
                {attendee.email && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{attendee.email}</p>
                )}
              </div>
              <span
                className={`shrink-0 text-xs ${
                  attendee.roleInMeeting === "Organizer"
                    ? "font-medium text-brand"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {attendee.roleInMeeting}
              </span>
              {attendee.roleInMeeting !== "Organizer" && (
                <>
                  <button
                    type="button"
                    onClick={() => startEditing(attendee)}
                    aria-label="Edit"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingRemoveId(attendee.id)}
                    aria-label="Remove"
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  >
                    <FiTrash2 />
                  </button>
                </>
              )}
            </div>
          ),
        )}
      </div>

      {isAdding ? (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-700">
          <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input
            placeholder={isFutureMeeting ? "Email" : "Email (optional)"}
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Select
            options={ATTENDEE_ROLE_OPTIONS}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          />
          <EditActions
            onCancel={() => setIsAdding(false)}
            onConfirm={() => void handleAddAttendee()}
            isLoading={isAddingSaving}
            confirmLabel="Add"
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<FiPlus aria-hidden="true" />}
          onClick={() => setIsAdding(true)}
        >
          Add attendee
        </Button>
      )}

      <ConfirmDialog
        isOpen={!!pendingRemoveId}
        message="Remove this attendee from the meeting?"
        variant="danger"
        isLoading={isRemoving}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setPendingRemoveId("")}
      />
    </div>
  );
}

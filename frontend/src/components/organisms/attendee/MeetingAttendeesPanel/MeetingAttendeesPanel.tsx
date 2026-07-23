import { useEffect, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2, FiUserCheck } from "react-icons/fi";
import toast from "react-hot-toast";
import { Button, Input, Loader } from "../../../atoms";
import { ConfirmDialog } from "../../../molecules/common";
import { addMeetingInvitations, removeMeetingAttendee } from "../../../../services/meetings";
import { getAttendee, updateAttendee } from "../../../../services/attendees";
import type { Attendee, Meeting } from "../../../../types";

export interface MeetingAttendeesPanelProps {
  meeting: Meeting;
  onChanged: () => void;
}

export default function MeetingAttendeesPanel({ meeting, onChanged }: MeetingAttendeesPanelProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [pendingRemoveId, setPendingRemoveId] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");
  const [isAddingSaving, setIsAddingSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const results = await Promise.all(meeting.attendeeIds.map((id) => getAttendee(id)));
        if (!cancelled) setAttendees(results);
      } catch {
        if (!cancelled) setError("Nu am putut incarca participantii.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [meeting.attendeeIds]);

  const startEditing = (attendee: Attendee) => {
    setEditingId(attendee.id);
    setEditName(attendee.name);
    setEditEmail(attendee.email);
    setEditRole(attendee.roleInMeeting);
  };

  const saveEditing = async () => {
    if (!editName.trim() || !editEmail.trim() || !editRole.trim()) return;
    setIsSaving(true);
    try {
      const updated = await updateAttendee(editingId, {
        name: editName.trim(),
        email: editEmail.trim(),
        roleInMeeting: editRole.trim(),
      });
      setAttendees((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success("Participant actualizat.");
      setEditingId("");
    } catch {
      toast.error("Nu am putut actualiza participantul.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmRemove = async () => {
    setIsRemoving(true);
    try {
      await removeMeetingAttendee(meeting.id, pendingRemoveId);
      toast.success("Participant eliminat.");
      setPendingRemoveId("");
      onChanged();
    } catch {
      toast.error("Nu am putut elimina participantul.");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleAddAttendee = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    setIsAddingSaving(true);
    try {
      await addMeetingInvitations(meeting.id, [
        { name: newName.trim(), email: newEmail.trim(), roleInMeeting: newRole.trim() || undefined },
      ]);
      toast.success("Participant adaugat.");
      setNewName("");
      setNewEmail("");
      setNewRole("");
      setIsAdding(false);
      onChanged();
    } catch {
      toast.error("Nu am putut adauga participantul.");
    } finally {
      setIsAddingSaving(false);
    }
  };

  if (isLoading) return <Loader size="sm" label="Se incarca participantii..." />;

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {attendees.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500">Niciun participant inca.</p>
      )}

      <div className="flex flex-col gap-2">
        {attendees.map((attendee) =>
          editingId === attendee.id ? (
            <div
              key={attendee.id}
              className="flex flex-col gap-2 rounded-lg border border-brand/40 bg-brand/5 p-3"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Nume"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
                <Input
                  placeholder="Rol"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingId("")}
                  disabled={isSaving}
                >
                  Anuleaza
                </Button>
                <Button type="button" size="sm" isLoading={isSaving} onClick={() => void saveEditing()}>
                  Salveaza
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={attendee.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
            >
              <FiUserCheck className="shrink-0 text-gray-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{attendee.name}</p>
                <p className="truncate text-xs text-gray-500">{attendee.email}</p>
              </div>
              <span className="shrink-0 text-xs text-gray-400">{attendee.roleInMeeting}</span>
              <button
                type="button"
                onClick={() => startEditing(attendee)}
                aria-label="Editeaza"
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <FiEdit2 />
              </button>
              <button
                type="button"
                onClick={() => setPendingRemoveId(attendee.id)}
                aria-label="Elimina"
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <FiTrash2 />
              </button>
            </div>
          ),
        )}
      </div>

      {isAdding ? (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3">
          <Input placeholder="Nume" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input
            placeholder="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Input
            placeholder="Rol (optional)"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAdding(false)}
              disabled={isAddingSaving}
            >
              Anuleaza
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={isAddingSaving}
              onClick={() => void handleAddAttendee()}
            >
              Adauga
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<FiPlus aria-hidden="true" />}
          onClick={() => setIsAdding(true)}
        >
          Adauga participant
        </Button>
      )}

      <ConfirmDialog
        isOpen={!!pendingRemoveId}
        message="Sigur vrei sa elimini acest participant din sedinta?"
        variant="danger"
        isLoading={isRemoving}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setPendingRemoveId("")}
      />
    </div>
  );
}

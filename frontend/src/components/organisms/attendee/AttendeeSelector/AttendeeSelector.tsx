import { useEffect, useState } from "react";
import { FiPlus, FiUserCheck } from "react-icons/fi";
import { Button, Input, Loader } from "../../../atoms";
import { api } from "../../../../services/api";

export interface Attendee {
  id: string;
  name: string;
  email: string;
  roleInMeeting: string;
  attendanceStatus: string;
}

export interface AttendeeSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function AttendeeSelector({
  selectedIds,
  onChange,
}: AttendeeSelectorProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");

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

  const toggle = (id: string) => {
    if (selectedIds.includes(id))
      onChange(selectedIds.filter((sid) => sid !== id));
    else onChange([...selectedIds, id]);
  };

  const handleAddAttendee = async () => {
    if (!newName.trim() || !newEmail.trim() || !newRole.trim()) return;
    setIsSaving(true);
    try {
      const { data } = await api.post<Attendee>("/attendees", {
        name: newName.trim(),
        email: newEmail.trim(),
        roleInMeeting: newRole.trim(),
      });
      setAttendees((prev) => [...prev, data]);
      onChange([...selectedIds, data.id]);
      setNewName("");
      setNewEmail("");
      setNewRole("");
      setIsAdding(false);
    } catch {
      setError("Couldn't add attendee.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Loader size="sm" label="Loading attendees…" />;

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}

      {attendees.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500">No attendees yet.</p>
      )}

      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
        {attendees.map((a) => (
          <label
            key={a.id}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(a.id)}
              onChange={() => toggle(a.id)}
              className="h-4 w-4 rounded border-gray-300 text-brand focus-visible:ring-brand"
            />
            <FiUserCheck
              className="shrink-0 text-gray-400"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-gray-900">
              {a.name}
            </span>
            <span className="shrink-0 text-xs text-gray-400">
              {a.roleInMeeting}
            </span>
          </label>
        ))}
      </div>

      {isAdding ? (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3">
          <Input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            placeholder="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Input
            placeholder="Role in meeting"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={isSaving}
              onClick={() => void handleAddAttendee()}
            >
              Add
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
          New attendee
        </Button>
      )}
    </div>
  );
}

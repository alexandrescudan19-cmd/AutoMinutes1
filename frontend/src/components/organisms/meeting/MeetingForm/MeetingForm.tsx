import { useState, type FormEvent } from "react";
import { FiClock, FiUsers, FiVideo } from "react-icons/fi";
import { Button, Input, Select, TextArea } from "../../../atoms";
import AttendeeSelector from "../../attendee/AttendeeSelector/AttendeeSelector.tsx";
import { useGoogleConnectionStatus } from "../../../../hooks/useGoogleConnectionStatus";

export interface MeetingFormValues {
  title: string;
  description: string;
  startDateTime: string; // ISO string
  endDateTime: string; // ISO string
  status: string;
  attendeeIds: string[];
  createGoogleCalendarEvent: boolean;
}

export interface MeetingFormProps {
  initialValues?: Partial<MeetingFormValues>;
  onSubmit: (values: MeetingFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  showGoogleCalendarOption?: boolean;
}

const STATUS_OPTIONS = [
  { value: "Upcoming", label: "Upcoming" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

// Limita de caractere pentru descriere (~150-200 cuvinte)
const MAX_DESCRIPTION_LENGTH = 1000;

function SectionLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: string;
}) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
      {icon}
      {children}
    </p>
  );
}

export default function MeetingForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  showGoogleCalendarOption = false,
}: MeetingFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [startDateTime, setStartDateTime] = useState(
    initialValues?.startDateTime ?? "",
  );
  const [endDateTime, setEndDateTime] = useState(
    initialValues?.endDateTime ?? "",
  );
  const [status, setStatus] = useState(initialValues?.status ?? "Upcoming");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    initialValues?.attendeeIds ?? [],
  );
  const [createGoogleCalendarEvent, setCreateGoogleCalendarEvent] = useState(
    initialValues?.createGoogleCalendarEvent ?? false,
  );
  const { connected: googleConnected, loading: googleStatusLoading } =
    useGoogleConnectionStatus();

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !startDateTime || !endDateTime) {
      setError("Title, start date and end date are required.");
      return;
    }

    // Validare suplimentară pentru lungimea descrierii
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setError(
        `Description is too long. Maximum allowed is ${MAX_DESCRIPTION_LENGTH} characters.`,
      );
      return;
    }

    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError("Please enter a valid start and end date.");
      return;
    }
    if (endDate <= startDate) {
      setError("End date must be after the start date.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        status,
        attendeeIds,
        createGoogleCalendarEvent,
      });
    } catch {
      setError("Couldn't save the meeting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col" onSubmit={(e) => void handleSubmit(e)}>
      <div className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto pr-2">
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sprint planning"
          />

          {/* CÂMPUL DE DESCRIERE CU LIMITĂ ȘI CONTOR */}
          <div className="flex flex-col gap-1">
            <TextArea
              label="Description"
              value={description}
              maxLength={MAX_DESCRIPTION_LENGTH}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this meeting about?"
            />
            <div className="text-right text-xs text-gray-400">
              {description.length} / {MAX_DESCRIPTION_LENGTH}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-100 pt-5">
          <SectionLabel icon={<FiClock aria-hidden="true" />}>
            Schedule
          </SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Starts at"
              type="datetime-local"
              required
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
            />
            <Input
              label="Ends at"
              type="datetime-local"
              required
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
            />
          </div>
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-5">
          <SectionLabel icon={<FiUsers aria-hidden="true" />}>
            Attendees
          </SectionLabel>
          <AttendeeSelector
            selectedIds={attendeeIds}
            onChange={setAttendeeIds}
          />
        </div>

        {showGoogleCalendarOption && (
          <div className="flex flex-col gap-2 border-t border-gray-100 pt-5">
            <SectionLabel icon={<FiVideo aria-hidden="true" />}>
              Google Meet
            </SectionLabel>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={createGoogleCalendarEvent && googleConnected}
                disabled={!googleConnected || googleStatusLoading}
                onChange={(e) => setCreateGoogleCalendarEvent(e.target.checked)}
                className="h-4 w-4"
              />
              Creeaza eveniment Google Calendar + link Google Meet
            </label>
            {!googleStatusLoading && !googleConnected && (
              <p className="text-xs text-amber-600">
                Trebuie sa conectezi contul Google din sidebar ca sa poti crea evenimente
                Google Meet.
              </p>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

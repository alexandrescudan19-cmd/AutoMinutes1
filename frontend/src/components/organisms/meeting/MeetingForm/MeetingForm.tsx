import { useRef, useState } from "react";
import {
  FiCheck,
  FiClock,
  FiEye,
  FiFileText,
  FiUpload,
  FiUsers,
  FiVideo,
} from "react-icons/fi";
import { Button, Input, Select, TextArea } from "../../../atoms";
import { Modal } from "../../../molecules/common";
import AttendeeSelector from "../../attendee/AttendeeSelector/AttendeeSelector.tsx";
import { useGoogleConnectionStatus } from "../../../../hooks/useGoogleConnectionStatus";

export interface MeetingFormValues {
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  attendeeIds: string[];
  createGoogleCalendarEvent: boolean;
  transcript?: string;
  transcriptFile?: File;
  transcriptFileFormat?: string;
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

const MAX_DESCRIPTION_LENGTH = 1000;

const MIN_YEAR = 2000;
const MAX_YEAR = new Date().getFullYear() + 5;
const MIN_DATE = `${MIN_YEAR}-01-01`;
const MAX_DATE = `${MAX_YEAR}-12-31`;

type StepId = "details" | "schedule" | "attendees" | "google" | "transcript";

function canPreviewTranscriptFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    file.type.startsWith("text/") ||
    ["txt", "csv", "json", "md", "srt", "vtt", "log"].includes(extension ?? "")
  );
}

function SectionLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: string;
}) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
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
  const [transcript, setTranscript] = useState(initialValues?.transcript ?? "");
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [transcriptFileFormat, setTranscriptFileFormat] = useState(
    initialValues?.transcriptFileFormat ?? "text",
  );
  const transcriptFileInputRef = useRef<HTMLInputElement>(null);
  const { connected: googleConnected, loading: googleStatusLoading } =
    useGoogleConnectionStatus();

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now] = useState(() => Date.now());
  const [isTranscriptViewOpen, setIsTranscriptViewOpen] = useState(false);

  const isFutureMeeting = startDateTime
    ? new Date(startDateTime).getTime() > now
    : true;

  const smartStep: { id: StepId; label: string } = isFutureMeeting
    ? { id: "google", label: "Google Meet" }
    : { id: "transcript", label: "Transcript" };

  const steps: { id: StepId; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "schedule", label: "Schedule" },
    { id: "attendees", label: "Attendees" },
    ...(showGoogleCalendarOption ? [smartStep] : []),
  ];
  const [stepIndex, setStepIndex] = useState(0);
  const activeStep = steps[stepIndex].id;
  const isLastStep = stepIndex === steps.length - 1;

  const validateDetails = (): string => {
    if (!title.trim()) return "Title is required.";
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return `Description is too long. Maximum ${MAX_DESCRIPTION_LENGTH} characters.`;
    }
    return "";
  };

  const getDatePart = (value: string) =>
    value.includes("T") ? value.split("T")[0] : "";
  const getTimePart = (value: string) =>
    value.includes("T") ? value.split("T")[1] : "";
  const meetingDate = getDatePart(startDateTime) || getDatePart(endDateTime);

  const handleDateChange = (date: string) => {
    if (!date) {
      setStartDateTime("");
      setEndDateTime("");
      return;
    }
    const startTime = getTimePart(startDateTime) || "09:00";
    const endTime = getTimePart(endDateTime) || "10:00";
    setStartDateTime(`${date}T${startTime}`);
    setEndDateTime(`${date}T${endTime}`);
  };

  const handleStartTimeChange = (time: string) => {
    if (!meetingDate) return;
    setStartDateTime(`${meetingDate}T${time}`);
  };

  const handleEndTimeChange = (time: string) => {
    if (!meetingDate) return;
    setEndDateTime(`${meetingDate}T${time}`);
  };

  const validateSchedule = (): string => {
    if (!startDateTime || !endDateTime)
      return "Start and end dates are required.";
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return "Enter a valid start and end date.";
    }
    if (
      startDate.getFullYear() < MIN_YEAR ||
      startDate.getFullYear() > MAX_YEAR
    ) {
      return `Enter a year between ${MIN_YEAR} and ${MAX_YEAR}.`;
    }
    if (endDate <= startDate) return "End date must be after the start date.";
    return "";
  };

  const isDetailsValid = !validateDetails();
  const isScheduleValid = !validateSchedule();
  const isCurrentStepValid =
    activeStep === "details"
      ? isDetailsValid
      : activeStep === "schedule"
        ? isScheduleValid
        : true;
  const canFinish = isDetailsValid && isScheduleValid;

  const currentStepError =
    activeStep === "details"
      ? validateDetails()
      : activeStep === "schedule"
        ? validateSchedule()
        : "";

  const maxReachableIndex = !isDetailsValid
    ? 0
    : !isScheduleValid
      ? 1
      : steps.length - 1;

  const goToStep = (index: number) => {
    if (index > maxReachableIndex) return;
    setError("");
    setStepIndex(index);
  };

  const goNext = () => {
    setError("");
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  const goBack = () => {
    setError("");
    setStepIndex((index) => Math.max(index - 1, 0));
  };

  const handleTranscriptFileChange = async (file: File | undefined) => {
    if (!file) return;
    setTranscriptFile(file);
    setTranscriptFileFormat(file.name.split(".").pop() || file.type || "file");
    if (!canPreviewTranscriptFile(file)) {
      setTranscript("");
      return;
    }

    const text = await file.text();
    setTranscript(text);
  };

  const handleFinalSubmit = async () => {
    const detailsError = validateDetails();
    const scheduleError = validateSchedule();
    const validationError = detailsError || scheduleError;
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        startDateTime: new Date(startDateTime).toISOString(),
        endDateTime: new Date(endDateTime).toISOString(),
        status,
        attendeeIds,
        createGoogleCalendarEvent: isFutureMeeting && createGoogleCalendarEvent,
        transcript:
          !isFutureMeeting && transcript.trim() ? transcript.trim() : undefined,
        transcriptFile: !isFutureMeeting
          ? (transcriptFile ?? undefined)
          : undefined,
        transcriptFileFormat,
      });
    } catch {
      setError("Couldn't save the meeting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="flex flex-1 items-center last:flex-none"
          >
            <button
              type="button"
              onClick={() => goToStep(index)}
              disabled={index > maxReachableIndex}
              className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                  index === stepIndex
                    ? "border-brand bg-brand text-white"
                    : index < stepIndex
                      ? "border-brand text-brand"
                      : "border-gray-300 text-gray-400 dark:border-gray-700 dark:text-gray-500"
                }`}
              >
                {index < stepIndex ? <FiCheck aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={`text-xs font-medium ${
                  index === stepIndex
                    ? "text-brand"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 rounded ${
                  index < stepIndex
                    ? "bg-brand"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex h-[min(400px,46vh)] flex-col gap-4 overflow-y-auto pr-1">
        {activeStep === "details" && (
          <div className="flex flex-col gap-4">
            <Input
              label="Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sprint planning"
            />
            <div className="flex flex-col gap-1">
              <TextArea
                label="Description"
                value={description}
                maxLength={MAX_DESCRIPTION_LENGTH}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this meeting about?"
                rows={6}
                style={{ resize: "none" }}
              />
              <div className="text-right text-xs text-gray-400 dark:text-gray-500">
                {description.length} / {MAX_DESCRIPTION_LENGTH}
              </div>
            </div>
          </div>
        )}

        {activeStep === "schedule" && (
          <div className="flex flex-col gap-4">
            <SectionLabel icon={<FiClock aria-hidden="true" />}>
              Schedule
            </SectionLabel>
            <Input
              label="Date"
              type="date"
              required
              min={MIN_DATE}
              max={MAX_DATE}
              value={meetingDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start time"
                type="time"
                required
                disabled={!meetingDate}
                value={getTimePart(startDateTime)}
                onChange={(e) => handleStartTimeChange(e.target.value)}
              />
              <Input
                label="End time"
                type="time"
                required
                disabled={!meetingDate}
                value={getTimePart(endDateTime)}
                onChange={(e) => handleEndTimeChange(e.target.value)}
              />
            </div>
            {!meetingDate && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Pick the meeting date first.
              </p>
            )}
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>
        )}

        {activeStep === "attendees" && (
          <div className="flex flex-col gap-2">
            <SectionLabel icon={<FiUsers aria-hidden="true" />}>
              Attendees
            </SectionLabel>
            <AttendeeSelector
              selectedIds={attendeeIds}
              onChange={setAttendeeIds}
              requireEmail={isFutureMeeting}
            />
          </div>
        )}

        {activeStep === "google" && (
          <div className="flex flex-col gap-2">
            <SectionLabel icon={<FiVideo aria-hidden="true" />}>
              Google Meet
            </SectionLabel>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={createGoogleCalendarEvent && googleConnected}
                disabled={!googleConnected || googleStatusLoading}
                onChange={(e) => setCreateGoogleCalendarEvent(e.target.checked)}
                className="h-4 w-4"
              />
              Create Google Calendar event + Google Meet link
            </label>
            {!googleStatusLoading && !googleConnected && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                You need to connect your Google account from the sidebar to
                create Google Meet events.
              </p>
            )}
          </div>
        )}

        {activeStep === "transcript" && (
          <div className="flex flex-col gap-2">
            <SectionLabel icon={<FiFileText aria-hidden="true" />}>
              Transcript
            </SectionLabel>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The selected date is in the past. You can attach the meeting
              transcript now - at Finish, it will automatically go into AI
              processing.
            </p>
            <TextArea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the meeting transcript here (optional)..."
              rows={8}
              className="font-mono text-sm"
              style={{ resize: "none" }}
            />
            <input
              ref={transcriptFileInputRef}
              type="file"
              className="hidden"
              onChange={(e) =>
                void handleTranscriptFileChange(e.target.files?.[0])
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<FiUpload aria-hidden="true" />}
                onClick={() => transcriptFileInputRef.current?.click()}
              >
                Upload transcript file
              </Button>
              {transcript && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<FiEye aria-hidden="true" />}
                  onClick={() => setIsTranscriptViewOpen(true)}
                >
                  View full transcript
                </Button>
              )}
            </div>
            {transcriptFile && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Selected file: {transcriptFile.name}
                {!transcript && " - preview unavailable for this file type"}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-2 min-h-[1.25rem] text-sm text-red-600 dark:text-red-400">
        {currentStepError || error}
      </p>

      <div className="mt-3 flex justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={goBack}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          {isLastStep ? (
            <Button
              type="button"
              isLoading={isSubmitting}
              disabled={!canFinish}
              onClick={() => void handleFinalSubmit()}
            >
              {submitLabel}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!isCurrentStepValid}
              onClick={goNext}
            >
              Next
            </Button>
          )}
        </div>
      </div>

      <Modal
        isOpen={isTranscriptViewOpen}
        onClose={() => setIsTranscriptViewOpen(false)}
        title="Full transcript"
        size="lg"
      >
        <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words font-mono text-sm text-gray-800 dark:text-gray-200">
          {transcript}
        </pre>
      </Modal>
    </div>
  );
}

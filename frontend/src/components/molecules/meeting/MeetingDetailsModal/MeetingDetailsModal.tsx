import { useCallback, useEffect, useState } from "react";
import {
  FiDownload,
  FiEdit2,
  FiLink,
  FiMessageSquare,
  FiTrash2,
  FiUploadCloud,
  FiVideo,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Modal from "../../common/Modal/Modal.tsx";
import StatusBadge from "../../common/StatusBadge/StatusBadge.tsx";
import ConfirmDialog from "../../common/ConfirmDialog/ConfirmDialog.tsx";
import { Button } from "../../../atoms";
import MeetingForm from "../../../organisms/meeting/MeetingForm/MeetingForm.tsx";
import MeetingAttendeesPanel from "../../../organisms/attendee/MeetingAttendeesPanel/MeetingAttendeesPanel.tsx";
import AiResultsPanel from "../../../organisms/ai/AiResultsPanel/AiResultsPanel.tsx";
import { getAiResult } from "../../../../services/ai";
import { listMeetingActionItems } from "../../../../services/actionItems";
import {
  addMeetingComment,
  createMeetingShareLink,
  getMeeting,
  importMeetTranscript,
  listMeetingComments,
} from "../../../../services/meetings";
import { useMeetingsStore } from "../../../../stores/meetingsStore";
import {
  formatDateRange,
  toDateTimeLocalValue,
} from "../../../../utils/date.ts";
import { useRealtimeEvent } from "../../../../hooks/useRealtime";
import type { Meeting, MeetingComment } from "../../../../types";

type Tab = "overview" | "attendees" | "ai" | "comments";

export interface MeetingDetailsModalProps {
  meetingId: string | null;
  onClose: () => void;
  initialTab?: Tab;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "attendees", label: "Attendees" },
  { key: "ai", label: "Transcript & AI" },
  { key: "comments", label: "Comments" },
];

export default function MeetingDetailsModal({
  meetingId,
  onClose,
  initialTab = "overview",
}: MeetingDetailsModalProps) {
  const updateMeeting = useMeetingsStore((state) => state.updateMeeting);
  const deleteMeeting = useMeetingsStore((state) => state.deleteMeeting);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [comments, setComments] = useState<MeetingComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isImportingTranscript, setIsImportingTranscript] = useState(false);

  const loadComments = useCallback(async (id: string) => {
    setComments(await listMeetingComments(id));
  }, []);

  const refetchMeeting = useCallback(async (id: string) => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getMeeting(id);
      setMeeting(data);
      await loadComments(id);
    } catch {
      setError("Couldn't load the meeting.");
    } finally {
      setIsLoading(false);
    }
  }, [loadComments]);

  const exportMarkdown = async () => {
    if (!meeting) return;
    const [aiResult, actionItems] = await Promise.all([
      meeting.aiResultId ? getAiResult(meeting.aiResultId).catch(() => null) : Promise.resolve(null),
      listMeetingActionItems(meeting.id).catch(() => []),
    ]);

    const markdown = [
      `# ${meeting.title}`,
      "",
      `Status: ${meeting.status}`,
      `AI status: ${meeting.aiStatus}`,
      `Date: ${formatDateRange(meeting.startDateTime, meeting.endDateTime)}`,
      "",
      "## Description",
      meeting.description || "No description.",
      "",
      "## Summary",
      aiResult?.summary || "No AI summary available.",
      "",
      "## Key Points",
      ...(aiResult?.keyPoints?.length
        ? aiResult.keyPoints.map((point) => `- ${point}`)
        : ["No key points available."]),
      "",
      "## Decisions",
      ...(aiResult?.decisions?.length
        ? aiResult.decisions.map((decision) => `- ${decision}`)
        : ["No decisions available."]),
      "",
      "## Follow-up Notes",
      aiResult?.followUpNotes || "No follow-up notes available.",
      "",
      "## Action Items",
      ...(actionItems.length
        ? actionItems.map((item) => {
            const dueDate = item.dueDate ? `, due ${new Date(item.dueDate).toLocaleDateString()}` : "";
            return `- [${item.status}] ${item.task} - ${item.responsiblePerson}${dueDate}`;
          })
        : ["No action items available."]),
    ].join("\n");
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${meeting.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-summary.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const shareMeeting = async () => {
    if (!meeting) return;
    const { url } = await createMeetingShareLink(meeting.id);
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied.");
  };

  const handleImportMeetTranscript = async () => {
    if (!meeting) return;
    setIsImportingTranscript(true);
    try {
      await importMeetTranscript(meeting.id);
      toast.success("Transcript imported from Google Meet.");
      await refetchMeeting(meeting.id);
      setActiveTab("ai");
    } catch {
      toast.error("Couldn't import the Google Meet transcript yet.");
    } finally {
      setIsImportingTranscript(false);
    }
  };

  const saveComment = async () => {
    if (!meeting || !commentText.trim()) return;
    setIsCommenting(true);
    try {
      await addMeetingComment(meeting.id, commentText);
      setCommentText("");
      await loadComments(meeting.id);
    } finally {
      setIsCommenting(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (meetingId) {
        setActiveTab(initialTab);
        setIsEditing(false);
        void refetchMeeting(meetingId);
      } else {
        setMeeting(null);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialTab, meetingId, refetchMeeting]);

  useRealtimeEvent<{ meetingId: string }>("comment.created", (payload) => {
    if (!meeting?.id || payload.meetingId !== meeting.id) return;
    void loadComments(meeting.id);
  });

  const handleUpdate = async (values: {
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    status: string;
    attendeeIds: string[];
  }) => {
    if (!meeting) return;
    await updateMeeting(meeting.id, {
      title: values.title,
      description: values.description,
      startDateTime: values.startDateTime,
      endDateTime: values.endDateTime,
      status: values.status as Meeting["status"],
      attendeeIds: values.attendeeIds,
    });
    setIsEditing(false);
    await refetchMeeting(meeting.id);
  };

  const handleDelete = async () => {
    if (!meeting) return;
    setIsDeleting(true);
    try {
      await deleteMeeting(meeting.id);
      setIsDeleteOpen(false);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={!!meetingId}
      onClose={onClose}
      title={meeting?.title ?? ""}
      size="xl"
    >
      {isLoading && !meeting && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {meeting && (
        <div className="flex flex-col gap-4">
          <div className="flex shrink-0 gap-1 border-b border-gray-100 dark:border-gray-800">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="h-[min(440px,55vh)] overflow-y-auto pr-1 pt-1 pb-2">
            {activeTab === "overview" &&
              (isEditing ? (
                <MeetingForm
                  initialValues={{
                    title: meeting.title,
                    description: meeting.description ?? "",
                    startDateTime: toDateTimeLocalValue(meeting.startDateTime),
                    endDateTime: toDateTimeLocalValue(meeting.endDateTime),
                    status: meeting.status,
                    attendeeIds: meeting.attendeeIds,
                  }}
                  onSubmit={handleUpdate}
                  onCancel={() => setIsEditing(false)}
                  submitLabel="Save changes"
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={meeting.status} />
                    <StatusBadge
                      status={meeting.aiStatus}
                      label={
                        meeting.aiStatus.toLowerCase() === "completed"
                          ? "Transcript ready"
                          : undefined
                      }
                    />
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDateRange(
                      meeting.startDateTime,
                      meeting.endDateTime,
                    )}
                  </p>

                  {meeting.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {meeting.description}
                    </p>
                  )}

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {meeting.attendeeIds.length} attendees
                  </p>

                  {meeting.googleMeetLink && (
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={meeting.googleMeetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex w-fit items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-medium text-brand hover:bg-brand/10 dark:hover:bg-brand/20"
                      >
                        <FiVideo aria-hidden="true" />
                        Join on Google Meet
                      </a>
                      <Button
                        type="button"
                        variant="secondary"
                        leftIcon={<FiUploadCloud aria-hidden="true" />}
                        isLoading={isImportingTranscript}
                        onClick={() => void handleImportMeetTranscript()}
                      >
                        Import transcript
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      leftIcon={<FiDownload aria-hidden="true" />}
                      onClick={() => void exportMarkdown()}
                    >
                      Export Markdown
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      leftIcon={<FiLink aria-hidden="true" />}
                      onClick={() => void shareMeeting()}
                    >
                      Share summary
                    </Button>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <Button
                      type="button"
                      variant="secondary"
                      leftIcon={<FiEdit2 aria-hidden="true" />}
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      leftIcon={<FiTrash2 aria-hidden="true" />}
                      onClick={() => setIsDeleteOpen(true)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

            {activeTab === "attendees" && (
              <MeetingAttendeesPanel
                meeting={meeting}
                onChanged={() => void refetchMeeting(meeting.id)}
              />
            )}

            {activeTab === "ai" && (
              <AiResultsPanel
                meeting={meeting}
                onMeetingChanged={() => void refetchMeeting(meeting.id)}
              />
            )}

            {activeTab === "comments" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    rows={3}
                    className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    placeholder="Write a comment..."
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      leftIcon={<FiMessageSquare />}
                      isLoading={isCommenting}
                      disabled={!commentText.trim()}
                      onClick={() => void saveComment()}
                    >
                      Comment
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {comment.authorName}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                        {comment.message}
                      </p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete meeting?"
        message="This action is irreversible. Are you sure you want to delete this meeting?"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </Modal>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiDownload,
  FiEdit2,
  FiLink,
  FiMessageSquare,
  FiTrash2,
  FiUploadCloud,
  FiVideo,
} from "react-icons/fi";
import { Button, Card } from "../../components/atoms";
import { ConfirmDialog, StatusBadge } from "../../components/molecules/common";
import MeetingForm from "../../components/organisms/meeting/MeetingForm/MeetingForm.tsx";
import MeetingAttendeesPanel from "../../components/organisms/attendee/MeetingAttendeesPanel/MeetingAttendeesPanel.tsx";
import AiResultsPanel from "../../components/organisms/ai/AiResultsPanel/AiResultsPanel.tsx";
import { AppLayout } from "../../components/templates";
import { getAiResult } from "../../services/ai";
import { listMeetingActionItems } from "../../services/actionItems";
import {
  addMeetingComment,
  createMeetingShareLink,
  getMeeting,
  importMeetTranscript,
  listMeetingComments,
} from "../../services/meetings";
import { getFriendlyApiError } from "../../services/apiErrors";
import { useRealtimeEvent } from "../../hooks/useRealtime";
import { useMeetingsStore } from "../../stores/meetingsStore";
import {
  formatDateRange,
  toDateTimeLocalValue,
} from "../../utils/date.ts";
import type { Meeting, MeetingComment } from "../../types";

type MeetingTab = "overview" | "attendees" | "ai" | "comments";

const TABS: { key: MeetingTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "attendees", label: "Attendees" },
  { key: "ai", label: "Transcript & AI" },
  { key: "comments", label: "Comments" },
];

function readInitialTab(raw: string | null): MeetingTab {
  if (raw === "attendees" || raw === "ai" || raw === "comments") return raw;
  return "overview";
}

export default function MeetingDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const updateMeeting = useMeetingsStore((state) => state.updateMeeting);
  const deleteMeeting = useMeetingsStore((state) => state.deleteMeeting);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [comments, setComments] = useState<MeetingComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isImportingTranscript, setIsImportingTranscript] = useState(false);

  const pageTitle = meeting?.title ?? "Meeting details";
  const activeTab = readInitialTab(searchParams.get("tab"));

  const loadComments = useCallback(async (meetingId: string) => {
    setComments(await listMeetingComments(meetingId));
  }, []);

  const loadMeeting = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      setError("No meeting was selected.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const data = await getMeeting(id);
      setMeeting(data);
      await loadComments(id);
    } catch (caughtError) {
      setError(getFriendlyApiError(caughtError, "Couldn't load the meeting."));
    } finally {
      setIsLoading(false);
    }
  }, [id, loadComments]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMeeting();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMeeting]);

  useRealtimeEvent<{ meetingId: string }>("comment.created", (payload) => {
    if (!meeting?.id || payload.meetingId !== meeting.id) return;
    void loadComments(meeting.id);
  });

  const setTab = (tab: MeetingTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const saveComment = async () => {
    if (!meeting || !commentText.trim()) return;
    setIsCommenting(true);
    try {
      await addMeetingComment(meeting.id, commentText.trim());
      setCommentText("");
      await loadComments(meeting.id);
    } catch (caughtError) {
      toast.error(getFriendlyApiError(caughtError, "Couldn't add the comment."));
    } finally {
      setIsCommenting(false);
    }
  };

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
    await loadMeeting();
  };

  const handleDelete = async () => {
    if (!meeting) return;
    setIsDeleting(true);
    try {
      await deleteMeeting(meeting.id);
      navigate("/meetings");
    } finally {
      setIsDeleting(false);
    }
  };

  const importTranscript = async () => {
    if (!meeting) return;
    setIsImportingTranscript(true);
    try {
      await importMeetTranscript(meeting.id);
      toast.success("Transcript imported from Google Meet.");
      await loadMeeting();
      setTab("ai");
    } catch (caughtError) {
      toast.error(
        getFriendlyApiError(caughtError, "Couldn't import the Google Meet transcript yet."),
      );
    } finally {
      setIsImportingTranscript(false);
    }
  };

  const shareMeeting = async () => {
    if (!meeting) return;
    try {
      const { url } = await createMeetingShareLink(meeting.id);
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied.");
    } catch (caughtError) {
      toast.error(getFriendlyApiError(caughtError, "Couldn't create the share link."));
    }
  };

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
            const dueDate = item.dueDate
              ? `, due ${new Date(item.dueDate).toLocaleDateString()}`
              : "";
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

  const overviewStats = useMemo(
    () => [
      { label: "Status", value: meeting?.status ?? "-" },
      { label: "AI", value: meeting?.aiStatus ?? "-" },
      { label: "Attendees", value: String(meeting?.attendeeIds.length ?? 0) },
      { label: "Comments", value: String(comments.length) },
    ],
    [comments.length, meeting],
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            leftIcon={<FiArrowLeft aria-hidden="true" />}
            onClick={() => navigate("/meetings")}
          >
            Back to meetings
          </Button>

          <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {pageTitle}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {meeting
                    ? formatDateRange(meeting.startDateTime, meeting.endDateTime)
                    : "Direct meeting workspace"}
                </p>
              </div>

              {meeting && (
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={meeting.status} />
                  <StatusBadge
                    status={meeting.aiStatus}
                    label={meeting.aiStatus === "Completed" ? "AI done" : undefined}
                  />
                </div>
              )}
            </div>

            {meeting && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {overviewStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950/40"
                  >
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <Card>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading meeting...</p>
          </Card>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {meeting && !isLoading && !error && (
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex gap-1 overflow-x-auto border-b border-gray-100 dark:border-gray-800">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTab(tab.key)}
                    className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? "border-brand text-brand"
                        : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

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
                  <div className="flex flex-col gap-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
                          Description
                        </h2>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">
                          {meeting.description || "No description yet."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        {meeting.googleMeetLink && (
                          <a
                            href={meeting.googleMeetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex w-fit items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-medium text-brand hover:bg-brand/10 dark:hover:bg-brand/20"
                          >
                            <FiVideo aria-hidden="true" />
                            Join on Google Meet
                          </a>
                        )}
                        {meeting.googleMeetLink && (
                          <Button
                            type="button"
                            variant="secondary"
                            leftIcon={<FiUploadCloud aria-hidden="true" />}
                            isLoading={isImportingTranscript}
                            onClick={() => void importTranscript()}
                          >
                            Import transcript
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
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
                <MeetingAttendeesPanel meeting={meeting} onChanged={() => void loadMeeting()} />
              )}

              {activeTab === "ai" && (
                <AiResultsPanel meeting={meeting} onMeetingChanged={() => void loadMeeting()} />
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
                  <div className="grid gap-2">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {comment.authorName}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">
                          {comment.message}
                        </p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No comments yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete meeting?"
        message="This action is irreversible. Are you sure you want to delete this meeting?"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </AppLayout>
  );
}

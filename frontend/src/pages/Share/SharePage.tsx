import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiCalendar, FiClipboard, FiLink, FiList, FiPrinter } from "react-icons/fi";
import { Button, Card } from "../../components/atoms";
import { StatusBadge } from "../../components/molecules/common";
import { getSharedMeeting } from "../../services/meetings";
import { formatDate, formatDateRange } from "../../utils/date";
import type { AIResult, ActionItem, Meeting } from "../../types";

export default function SharePage() {
  const { token = "" } = useParams();
  const [data, setData] = useState<{ meeting: Meeting; aiResult?: AIResult; actionItems: ActionItem[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      try {
        setData(await getSharedMeeting(token));
      } catch {
        setError("This share link is invalid or expired.");
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [token]);

  const buildSummaryText = () => {
    if (!data) return "";
    const lines = [
      data.meeting.title,
      formatDateRange(data.meeting.startDateTime, data.meeting.endDateTime),
      "",
      "Summary",
      data.aiResult?.summary ?? "No summary available.",
      "",
      "Key points",
      ...(data.aiResult?.keyPoints?.length
        ? data.aiResult.keyPoints.map((point) => `- ${point}`)
        : ["No key points available."]),
      "",
      "Decisions",
      ...(data.aiResult?.decisions?.length
        ? data.aiResult.decisions.map((decision) => `- ${decision}`)
        : ["No decisions available."]),
      "",
      "Follow-up notes",
      data.aiResult?.followUpNotes ?? "No follow-up notes available.",
      "",
      "Action items",
      ...(data.actionItems.length
        ? data.actionItems.map((item) => {
            const dueDate = item.dueDate ? `, due ${formatDate(item.dueDate)}` : "";
            return `- [${item.status}] ${item.task} - ${item.responsiblePerson}${dueDate}`;
          })
        : ["No action items available."]),
    ];
    return lines.join("\n");
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Share link copied.");
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(buildSummaryText());
    toast.success("Summary copied.");
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 print:bg-white print:px-0 print:py-0 dark:bg-gray-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-5 print:max-w-none">
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 print:border-0 print:p-0 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand">AutoMinutes</p>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Shared Summary</h1>
            {data && (
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={data.meeting.status} />
                <StatusBadge status={data.meeting.aiStatus} />
              </div>
            )}
          </div>
          {data && (
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<FiLink aria-hidden="true" />}
                onClick={() => void copyShareLink()}
              >
                Copy link
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<FiClipboard aria-hidden="true" />}
                onClick={() => void copySummary()}
              >
                Copy summary
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<FiPrinter aria-hidden="true" />}
                onClick={() => window.print()}
              >
                Print
              </Button>
            </div>
          )}
        </div>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}
        {data && (
          <>
            <Card title={data.meeting.title}>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <p>{data.meeting.description || "No description available."}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-950/40">
                  <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <FiCalendar className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{formatDateRange(data.meeting.startDateTime, data.meeting.endDateTime)}</span>
                  </div>
                  <div className="mt-2 flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <FiList className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{data.actionItems.length} action items</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card title="Summary">
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{data.aiResult?.summary ?? "No summary available."}</p>
            </Card>
            <Card title="Key points">
              {data.aiResult?.keyPoints?.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                  {data.aiResult.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No key points available.</p>
              )}
            </Card>
            <Card title="Decisions">
              {data.aiResult?.decisions?.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                  {data.aiResult.decisions.map((decision, index) => (
                    <li key={index}>{decision}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No decisions available.</p>
              )}
            </Card>
            {data.aiResult?.followUpNotes && (
              <Card title="Follow-up notes">
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {data.aiResult.followUpNotes}
                </p>
              </Card>
            )}
            <Card title="Action items">
              {data.actionItems.length ? (
                <div className="flex flex-col gap-2">
                  {data.actionItems.map((item) => (
                    <div key={item.id} className="grid gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-[minmax(0,1fr)_160px_120px] sm:items-center">
                      <p className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">{item.task}</p>
                      <p className="break-words text-xs text-gray-500">{item.responsiblePerson}</p>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No action items available.</p>
              )}
            </Card>
          </>
        )}
      </div>
    </main>
  );
}

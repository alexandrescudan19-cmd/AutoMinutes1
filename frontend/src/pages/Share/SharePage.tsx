import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiClipboard, FiLink, FiPrinter } from "react-icons/fi";
import { Button, Card } from "../../components/atoms";
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
    <main className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand">AutoMinutes</p>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Shared Summary</h1>
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
        {error && <p className="text-sm text-red-500">{error}</p>}
        {data && (
          <>
            <Card title={data.meeting.title}>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p>{formatDateRange(data.meeting.startDateTime, data.meeting.endDateTime)}</p>
                <p>{data.meeting.description || "No description available."}</p>
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
                    <div key={item.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.task}</p>
                      <p className="text-xs text-gray-500">{item.responsiblePerson} / {item.status}</p>
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

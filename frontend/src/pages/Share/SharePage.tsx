import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../../components/atoms";
import { getSharedMeeting } from "../../services/meetings";
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

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">AutoMinutes Shared Summary</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {data && (
          <>
            <Card title={data.meeting.title}>
              <p className="text-sm text-gray-600 dark:text-gray-300">{data.meeting.description}</p>
            </Card>
            <Card title="Summary">
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{data.aiResult?.summary ?? "No summary available."}</p>
            </Card>
            <Card title="Action items">
              <div className="flex flex-col gap-2">
                {data.actionItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.task}</p>
                    <p className="text-xs text-gray-500">{item.responsiblePerson} / {item.status}</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}

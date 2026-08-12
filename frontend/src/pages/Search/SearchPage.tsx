import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "../../components/templates";
import { Card, Input } from "../../components/atoms";
import { searchGlobal } from "../../services/meetings";
import type { ActionItemListItem, Meeting } from "../../types";

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      if (!query.trim()) {
        setMeetings([]);
        setActionItems([]);
        setError("");
        return;
      }
      setSearchParams({ q: query }, { replace: true });
      setIsLoading(true);
      setError("");
      try {
        const result = await searchGlobal(query);
        setMeetings(result.meetings);
        setActionItems(result.actionItems);
      } catch {
        setError("Couldn't search right now.");
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [query, setSearchParams]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Search</h1>
        <Input label="Search meetings and action items" value={query} onChange={(e) => setQuery(e.target.value)} />
        {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Searching...</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Card title="Meetings">
          <div className="flex flex-col gap-2">
            {meetings.map((meeting) => (
              <button key={meeting.id} className="rounded-lg border border-gray-200 p-3 text-left dark:border-gray-700" onClick={() => navigate(`/meetings/${meeting.id}`)}>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{meeting.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{meeting.status} / {meeting.aiStatus}</p>
              </button>
            ))}
            {query && meetings.length === 0 && <p className="text-sm text-gray-500">No meetings found.</p>}
          </div>
        </Card>
        <Card title="Action items">
          <div className="flex flex-col gap-2">
            {actionItems.map((item) => (
              <button key={item.id} className="rounded-lg border border-gray-200 p-3 text-left dark:border-gray-700" onClick={() => navigate(`/action-items?item=${item.id}`)}>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.task}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.meetingTitle}</p>
              </button>
            ))}
            {query && actionItems.length === 0 && <p className="text-sm text-gray-500">No action items found.</p>}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "../../components/templates";
import { Card, Input } from "../../components/atoms";
import { StatusBadge } from "../../components/molecules";
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
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      if (!query.trim()) {
        requestIdRef.current += 1;
        setMeetings([]);
        setActionItems([]);
        setError("");
        setIsLoading(false);
        return;
      }
      setSearchParams({ q: query }, { replace: true });
      setIsLoading(true);
      setError("");
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      try {
        const result = await searchGlobal(query);
        if (requestIdRef.current !== requestId) return;
        setMeetings(result.meetings);
        setActionItems(result.actionItems);
      } catch {
        if (requestIdRef.current !== requestId) return;
        setError("Couldn't search right now.");
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
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
              <button
                key={meeting.id}
                className="rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                onClick={() => navigate(`/meetings/${meeting.id}`)}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">{meeting.title}</p>
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={meeting.status} />
                    <StatusBadge status={meeting.aiStatus} />
                  </div>
                </div>
              </button>
            ))}
            {query && !isLoading && meetings.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No meetings found.</p>
            )}
          </div>
        </Card>
        <Card title="Action items">
          <div className="flex flex-col gap-2">
            {actionItems.map((item) => (
              <button
                key={item.id}
                className="rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                onClick={() => navigate(`/action-items?item=${item.id}`)}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">{item.task}</p>
                    <p className="break-words text-xs text-gray-500 dark:text-gray-400">{item.meetingTitle}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </button>
            ))}
            {query && !isLoading && actionItems.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No action items found.</p>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

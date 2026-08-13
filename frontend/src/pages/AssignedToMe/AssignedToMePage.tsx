import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../../components/templates";
import { Card } from "../../components/atoms";
import { ActionItemList } from "../../components/organisms/action-item";
import { listActionItems } from "../../services/actionItems";
import { getStoredUser } from "../../services/authSession";
import type { ActionItemListItem } from "../../types";

export default function AssignedToMePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActionItemListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now] = useState(() => Date.now());
  const user = getStoredUser();

  const loadItems = async () => {
    setIsLoading(true);
    try {
      setItems(await listActionItems());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadItems(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const assigned = useMemo(() => {
    const needles = [user?.email, `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    return items.filter((item) =>
      needles.some((needle) => item.responsiblePerson.toLowerCase().includes(needle)),
    );
  }, [items, user?.email, user?.firstName, user?.lastName]);

  const dueSoon = assigned.filter((item) => {
    if (!item.dueDate || item.status === "Completed") return false;
    const time = new Date(item.dueDate).getTime();
    return time <= now + 3 * 24 * 60 * 60 * 1000;
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Assigned to me</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {assigned.length} tasks assigned to your name or email
          </p>
        </div>
        {dueSoon.length > 0 && (
          <Card title="Reminders">
            <ActionItemList
              items={dueSoon}
              showMeetingTitle
              onChanged={() => void loadItems()}
              onOpenMeeting={(meetingId) => navigate(`/meetings/${meetingId}`)}
            />
          </Card>
        )}
        <Card title="My action items">
          {isLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          ) : (
            <ActionItemList
              items={assigned}
              showMeetingTitle
              onChanged={() => void loadItems()}
              onOpenMeeting={(meetingId) => navigate(`/meetings/${meetingId}`)}
            />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

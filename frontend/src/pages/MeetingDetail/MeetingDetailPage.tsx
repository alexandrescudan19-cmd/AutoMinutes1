import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/atoms";
import { MeetingDetailsModal } from "../../components/molecules";
import { AppLayout } from "../../components/templates";

type MeetingTab = "overview" | "attendees" | "ai" | "comments";

function readInitialTab(raw: string | null): MeetingTab {
  if (raw === "attendees" || raw === "ai" || raw === "comments") return raw;
  return "overview";
}

export default function MeetingDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialTab = readInitialTab(searchParams.get("tab"));

  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Meeting details
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {id ? "Direct link for this meeting." : "No meeting was selected."}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => navigate("/meetings")}>
            Back to meetings
          </Button>
        </div>
        {!id && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Open a meeting from the list, search, notifications, or action items to view its details.
          </p>
        )}
      </div>

      <MeetingDetailsModal
        meetingId={id ?? null}
        initialTab={initialTab}
        onClose={() => navigate("/meetings")}
      />
    </AppLayout>
  );
}

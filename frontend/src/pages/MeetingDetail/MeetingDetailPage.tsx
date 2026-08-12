import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/atoms";
import { MeetingDetailsModal } from "../../components/molecules";
import { AppLayout } from "../../components/templates";

export default function MeetingDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Meeting details
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Direct link for this meeting.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => navigate("/meetings")}>
            Back to meetings
          </Button>
        </div>
      </div>

      <MeetingDetailsModal meetingId={id ?? null} onClose={() => navigate("/meetings")} />
    </AppLayout>
  );
}

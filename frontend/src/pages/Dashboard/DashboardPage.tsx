import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, MeetingRow, StatCard, type Meeting } from "../../components/molecules";
import { Button, Loader } from "../../components/atoms";
import { AppLayout } from "../../components/templates";
import { api } from "../../services/api";

interface RawMeeting {
  id: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  aiStatus: string;
  attendeeIds: string[];
  actionItemsCount: number;
}

interface MeetingHistoryResponse {
  items: RawMeeting[];
  total: number;
}

function toMeetingRowData(raw: RawMeeting): Meeting {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    startDateTime: raw.startDateTime,
    endDateTime: raw.endDateTime,
    status: raw.status,
    aiStatus: raw.aiStatus,
    attendeeIds: raw.attendeeIds ?? [],
    actionItemsCount: raw.actionItemsCount ?? 0,
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<RawMeeting[]>([]);
  const [total, setTotal] = useState(0);
  const [actionItemsCount, setActionItemsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [meetingsRes, actionItemsRes] = await Promise.all([
          api.get<MeetingHistoryResponse>("/meetings/history", {
            params: { page: 1, pageSize: 5, sort: "newest" },
          }),
          api.get("/ai/action-items"),
        ]);

        setMeetings(meetingsRes.data.items);
        setTotal(meetingsRes.data.total);

        const items = Array.isArray(actionItemsRes.data) ? actionItemsRes.data : [];
        setActionItemsCount(
          items.filter((item: { status?: string }) => item.status !== "Completed").length,
        );
      } catch {
        setError("Nu am putut incarca datele. Incearca din nou.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, []);

  const processingCount = meetings.filter((m) => m.aiStatus === "Processing").length;
  const completedCount = meetings.filter((m) => m.aiStatus === "Completed").length;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Privire de ansamblu asupra activitatii tale</p>
        </div>


        {isLoading && <Loader label="Se incarca..." />}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isLoading && !error && (
          <>
            <div className="flex flex-wrap gap-4">
              <StatCard label="Total intalniri" value={total} accent="blue" />
              <StatCard label="AI in procesare" value={processingCount} accent="amber" />
              <StatCard label="AI finalizat" value={completedCount} accent="green" />
              <StatCard label="Action items deschise" value={actionItemsCount} accent="amber" />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Intalniri recente</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate("/meetings")}>
                  Vezi toate
                </Button>
              </div>

              {meetings.length === 0 ? (
                <EmptyState
                  title="Nicio intalnire inca"
                  description="Creeaza prima intalnire ca sa incepi."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  {meetings.map((raw) => (
                    <MeetingRow
                      key={raw.id}
                      meeting={toMeetingRowData(raw)}
                      onClick={() => navigate("/meetings")}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
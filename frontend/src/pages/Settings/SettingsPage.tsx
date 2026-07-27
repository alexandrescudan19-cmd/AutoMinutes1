import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Card } from "../../components/atoms";
import { AppLayout } from "../../components/templates";
import { useGoogleConnectionStatus } from "../../hooks/useGoogleConnectionStatus";
import { api, API_BASE_URL } from "../../services/api";

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { connected, loading, refetch } = useGoogleConnectionStatus();
  const [message, setMessage] = useState("");
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    if (searchParams.get("googleConnected")) {
      setMessage("Your Google account was connected successfully.");
      void refetch();
      setSearchParams({}, { replace: true });
    } else if (searchParams.get("googleConnectError")) {
      setMessage("Connecting your Google account failed. Please try again.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refetch]);

  const handleConnect = () => {
    const token = localStorage.getItem("accessToken");
    window.location.href = `${API_BASE_URL}/auth/google/connect?token=${token}`;
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await api.post("/auth/google/disconnect");
      await refetch();
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>

        {message && <p className="text-sm text-brand">{message}</p>}

        <Card title="Google Calendar">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Connect your Google account so the meetings you create show up on your
                own calendar, with you as the organizer.
              </p>
              <div className="mt-2">
                {loading ? (
                  <Badge variant="neutral">Checking...</Badge>
                ) : connected ? (
                  <Badge variant="success">Connected</Badge>
                ) : (
                  <Badge variant="warning">Not connected</Badge>
                )}
              </div>
            </div>
            {connected ? (
              <Button
                variant="secondary"
                isLoading={isDisconnecting}
                onClick={() => void handleDisconnect()}
              >
                Disconnect
              </Button>
            ) : (
              <Button onClick={handleConnect}>Connect Google Calendar</Button>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

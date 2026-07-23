import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Card } from "../../components/atoms";
import { AppLayout } from "../../components/templates";
import { useGoogleConnectionStatus } from "../../hooks/useGoogleConnectionStatus";
import { api } from "../../services/api";

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { connected, loading, refetch } = useGoogleConnectionStatus();
  const [message, setMessage] = useState("");
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    if (searchParams.get("googleConnected")) {
      setMessage("Contul Google a fost conectat cu succes.");
      void refetch();
      setSearchParams({}, { replace: true });
    } else if (searchParams.get("googleConnectError")) {
      setMessage("Conectarea contului Google a eșuat. Încearcă din nou.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refetch]);

  const handleConnect = () => {
    const token = localStorage.getItem("accessToken");
    window.location.href = `http://localhost:3500/auth/google/connect?token=${token}`;
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
        <h1 className="text-xl font-semibold text-gray-900">Setări</h1>

        {message && <p className="text-sm text-brand">{message}</p>}

        <Card title="Google Calendar">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-700">
                Conectează-ți contul Google pentru ca ședințele pe care le creezi
                să apară pe propriul tău calendar, cu tine ca organizator.
              </p>
              <div className="mt-2">
                {loading ? (
                  <Badge variant="neutral">Se verifică...</Badge>
                ) : connected ? (
                  <Badge variant="success">Conectat</Badge>
                ) : (
                  <Badge variant="warning">Neconectat</Badge>
                )}
              </div>
            </div>
            {connected ? (
              <Button
                variant="secondary"
                isLoading={isDisconnecting}
                onClick={() => void handleDisconnect()}
              >
                Deconectează
              </Button>
            ) : (
              <Button onClick={handleConnect}>Conectează Google Calendar</Button>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

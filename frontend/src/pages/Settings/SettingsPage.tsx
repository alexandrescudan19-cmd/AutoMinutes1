import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Card } from "../../components/atoms";
import { AppLayout } from "../../components/templates";
import { useGoogleConnectionStatus } from "../../hooks/useGoogleConnectionStatus";
import { api, API_BASE_URL } from "../../services/api";
import { clearAuthSession, getAccessToken, isAccessTokenValid } from "../../services/authSession";
import { getAiProviderStatus } from "../../services/ai";
import { getMe, updateMe } from "../../services/users";
import type { AiProviderStatus } from "../../types";

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { connected, loading, refetch } = useGoogleConnectionStatus();
  const [message, setMessage] = useState("");
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiProviderStatus | null>(null);
  const [isAiStatusLoading, setIsAiStatusLoading] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (searchParams.get("googleConnected")) {
        setMessage("Your Google account was connected successfully.");
        void refetch();
        setSearchParams({}, { replace: true });
      } else if (searchParams.get("googleConnectError")) {
        setMessage("Connecting your Google account failed. Please try again.");
        setSearchParams({}, { replace: true });
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [searchParams, setSearchParams, refetch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      const user = await getMe();
      setFirstName(user.firstName);
      setLastName(user.lastName);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      setIsAiStatusLoading(true);
      try {
        setAiStatus(await getAiProviderStatus());
      } catch {
        setAiStatus(null);
      } finally {
        setIsAiStatusLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const saveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const user = await updateMe({ firstName, lastName });
      localStorage.setItem("user", JSON.stringify(user));
      setMessage("Profile updated.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConnect = () => {
    const token = getAccessToken();
    if (!isAccessTokenValid(token)) {
      clearAuthSession();
      window.location.href = "/login";
      return;
    }
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

        <Card title="Profile">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
              First name
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
              Last name
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <Button isLoading={isSavingProfile} onClick={() => void saveProfile()}>
              Save profile
            </Button>
          </div>
        </Card>

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

        <Card title="AI Provider">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Current transcript processing provider and model.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {isAiStatusLoading ? (
                  <Badge variant="neutral">Checking...</Badge>
                ) : aiStatus ? (
                  <>
                    <Badge variant="success">{aiStatus.ai.provider}</Badge>
                    {aiStatus.ai.openAiCompatible?.model && (
                      <Badge variant="neutral">{aiStatus.ai.openAiCompatible.model}</Badge>
                    )}
                    <Badge
                      variant={aiStatus.ai.openAiCompatible?.configured ? "success" : "warning"}
                    >
                      {aiStatus.ai.openAiCompatible?.configured ? "API key configured" : "No API key"}
                    </Badge>
                  </>
                ) : (
                  <Badge variant="danger">Unavailable</Badge>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              isLoading={isAiStatusLoading}
              onClick={() => {
                setIsAiStatusLoading(true);
                void getAiProviderStatus()
                  .then(setAiStatus)
                  .catch(() => setAiStatus(null))
                  .finally(() => setIsAiStatusLoading(false));
              }}
            >
              Refresh
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

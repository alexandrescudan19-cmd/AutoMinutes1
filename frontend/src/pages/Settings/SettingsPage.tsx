import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiCheckCircle, FiExternalLink, FiInfo, FiRefreshCw } from "react-icons/fi";
import { Badge, Button, Card } from "../../components/atoms";
import { AppLayout } from "../../components/templates";
import { useGoogleConnectionStatus } from "../../hooks/useGoogleConnectionStatus";
import { api, API_BASE_URL } from "../../services/api";
import { getFriendlyApiError } from "../../services/apiErrors";
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
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiProviderStatus | null>(null);
  const [isAiStatusLoading, setIsAiStatusLoading] = useState(true);
  const [aiStatusError, setAiStatusError] = useState("");

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
      try {
        const user = await getMe();
        setFirstName(user.firstName);
        setLastName(user.lastName);
      } catch (error) {
        setProfileError(getFriendlyApiError(error, "Couldn't load your profile."));
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const refreshAiStatus = async () => {
    setIsAiStatusLoading(true);
    setAiStatusError("");
    try {
      setAiStatus(await getAiProviderStatus());
    } catch (error) {
      setAiStatus(null);
      setAiStatusError(getFriendlyApiError(error, "Couldn't load AI provider status."));
    } finally {
      setIsAiStatusLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshAiStatus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const saveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError("");
    setMessage("");
    try {
      const user = await updateMe({ firstName, lastName });
      localStorage.setItem("user", JSON.stringify(user));
      setMessage("Profile updated.");
    } catch (error) {
      setProfileError(getFriendlyApiError(error, "Couldn't update your profile."));
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
    setMessage("");
    try {
      await api.post("/auth/google/disconnect");
      await refetch();
      setMessage("Google Calendar disconnected.");
    } catch (error) {
      setMessage(getFriendlyApiError(error, "Couldn't disconnect Google Calendar."));
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
          {profileError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{profileError}</p>
          )}
        </Card>

        <Card title="Google Calendar">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Connect your Google account so the meetings you create show up on your
                own calendar, with you as the organizer.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {loading ? (
                  <Badge variant="neutral">Checking...</Badge>
                ) : connected ? (
                  <Badge variant="success">Connected</Badge>
                ) : (
                  <Badge variant="warning">Not connected</Badge>
                )}
                <Badge variant="neutral">Calendar events</Badge>
                <Badge variant="neutral">Google Meet links</Badge>
              </div>
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                <div className="flex gap-2">
                  <FiInfo className="mt-0.5 shrink-0" aria-hidden="true" />
                  <p>
                    OAuth must use this frontend URL and your backend callback URL in Google Cloud.
                    If you use a dev tunnel, add that tunnel domain as an authorized JavaScript origin.
                  </p>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-md bg-white/70 p-2 dark:bg-gray-900/60">
                    <span className="font-semibold">Frontend origin</span>
                    <p className="mt-1 break-all">{window.location.origin}</p>
                  </div>
                  <div className="rounded-md bg-white/70 p-2 dark:bg-gray-900/60">
                    <span className="font-semibold">Backend auth base</span>
                    <p className="mt-1 break-all">{API_BASE_URL}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button
                type="button"
                variant="secondary"
                leftIcon={<FiRefreshCw aria-hidden="true" />}
                isLoading={loading}
                onClick={() => void refetch()}
              >
                Refresh
              </Button>
              {connected ? (
                <Button
                  variant="secondary"
                  isLoading={isDisconnecting}
                  onClick={() => void handleDisconnect()}
                >
                  Disconnect
                </Button>
              ) : (
                <Button leftIcon={<FiExternalLink aria-hidden="true" />} onClick={handleConnect}>
                  Connect Google Calendar
                </Button>
              )}
            </div>
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
                    {aiStatus.ai.openAiCompatible?.baseUrl && (
                      <Badge variant="neutral">{aiStatus.ai.openAiCompatible.baseUrl}</Badge>
                    )}
                    {aiStatus.ai.ollama?.model && (
                      <Badge variant="neutral">{aiStatus.ai.ollama.model}</Badge>
                    )}
                    <Badge
                      variant={aiStatus.ai.openAiCompatible?.configured ? "success" : "warning"}
                    >
                      {aiStatus.ai.openAiCompatible?.configured ? "API key configured" : "No API key"}
                    </Badge>
                    {aiStatus.ai.openAiCompatible?.configured && (
                      <Badge variant="success">
                        <FiCheckCircle className="mr-1" aria-hidden="true" />
                        Ready
                      </Badge>
                    )}
                  </>
                ) : (
                  <Badge variant="danger">Unavailable</Badge>
                )}
              </div>
              {!isAiStatusLoading && aiStatus && !aiStatus.ai.openAiCompatible?.configured && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  Add an OpenAI-compatible API key in the backend environment to use cloud AI instead of fallback/local processing.
                </p>
              )}
              {aiStatusError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{aiStatusError}</p>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              isLoading={isAiStatusLoading}
              onClick={() => void refreshAiStatus()}
            >
              Refresh
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

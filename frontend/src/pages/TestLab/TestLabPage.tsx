import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  FiBell,
  FiCheckCircle,
  FiCpu,
  FiDownload,
  FiEdit3,
  FiFileText,
  FiRefreshCw,
  FiSend,
  FiTrash2,
} from "react-icons/fi";
import { Badge, Button, Card, Input, TextArea } from "../../components/atoms";
import { SearchBar, StatusBadge } from "../../components/molecules/common";
import { AppLayout } from "../../components/templates";
import { api } from "../../services/api";

interface StoredUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  aiStatus?: string;
  googleMeetLink?: string;
  transcriptId?: string;
  attendeeIds?: string[];
  invitationIds?: string[];
  notificationIds?: string[];
}

interface Invitation {
  id: string;
  meetingId: string;
  participantEmail: string;
  invitationStatus: string;
  sentAt: string;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  sentAt: string;
  isRead?: boolean;
}

interface Transcript {
  id: string;
  meetingId: string;
  content: string;
  fileFormat: string;
  uploadedAt: string;
}

interface AiResult {
  id?: string;
  summary?: string;
  keyPoints?: string[];
  decisions?: string[];
  meetingStatistics?: {
    durationMinutes?: number;
    participantCount?: number;
    actionItemCount?: number;
    processingStatus?: string;
  };
  actionItemIds?: string[];
}

type HistorySort = "newest" | "oldest" | "status";

function toLocalDateTime(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromLocalDateTime(value: string) {
  return new Date(value);
}

function defaultStartDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 20);
  return toLocalDateTime(date);
}

function defaultEndDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 50);
  return toLocalDateTime(date);
}

function parseParticipants(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bracketMatch = line.match(/^(.*?)\s*<([^>]+)>$/);
      if (bracketMatch) {
        return {
          name: bracketMatch[1].trim() || bracketMatch[2].trim(),
          email: bracketMatch[2].trim(),
          roleInMeeting: "Participant",
        };
      }

      const [nameOrEmail, email, roleInMeeting] = line
        .split(",")
        .map((part) => part.trim());

      return {
        name: email ? nameOrEmail : nameOrEmail,
        email: email || nameOrEmail,
        roleInMeeting: roleInMeeting || "Participant",
      };
    });
}

function formatDate(raw: string) {
  return new Date(raw).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isMeetingFinished(meeting?: Meeting) {
  if (!meeting) return false;
  return meeting.status === "Completed" || Date.now() >= new Date(meeting.endDateTime).getTime();
}

function sortMeetings(meetings: Meeting[], sort: HistorySort) {
  const statusOrder: Record<string, number> = {
    "In Progress": 0,
    Upcoming: 1,
    Completed: 2,
    Cancelled: 3,
  };

  return [...meetings].sort((left, right) => {
    if (sort === "status") {
      const statusDiff =
        (statusOrder[left.status] ?? 99) - (statusOrder[right.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;
    }

    const leftTime = new Date(left.startDateTime).getTime();
    const rightTime = new Date(right.startDateTime).getTime();
    return sort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
  });
}

function filterMeetings(meetings: Meeting[], query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return meetings;

  return meetings.filter((meeting) =>
    [
      meeting.id,
      meeting.title,
      meeting.description,
      meeting.status,
      meeting.aiStatus,
      meeting.transcriptId,
      formatDate(meeting.startDateTime),
      formatDate(meeting.endDateTime),
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(search)),
  );
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = error.response.data as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(" ");
    if (data.message) return data.message;
  }

  return fallback;
}

export default function TestLabPage() {
  const user = useMemo<StoredUser | null>(
    () => JSON.parse(localStorage.getItem("user") ?? "null"),
    [],
  );
  const fallbackOwnerId = user?.id ?? "000000000000000000000001";
  const defaultEmail = user?.email ?? "test@example.com";

  const [backendStatus, setBackendStatus] = useState("Neverificat");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [historySort, setHistorySort] = useState<HistorySort>("newest");
  const [historySearch, setHistorySearch] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [lookupEmail, setLookupEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [viewedTranscript, setViewedTranscript] = useState<Transcript | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [autoImportStatus, setAutoImportStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");

  const [title, setTitle] = useState("Test Google Meet transcript");
  const [description, setDescription] = useState("Meeting creat din pagina de test.");
  const [startDateTime, setStartDateTime] = useState(defaultStartDateTime);
  const [endDateTime, setEndDateTime] = useState(defaultEndDateTime);
  const [createGoogleMeet, setCreateGoogleMeet] = useState(true);
  const [participants, setParticipants] = useState(`${defaultEmail}`);
  const [aiTranscript, setAiTranscript] = useState(
    "Alex: Pregatesc integrarea cu Google Meet pana joi.\nMaria: Eu verific notificarile si invitatiile.",
  );
  const [meetingPatchTitle, setMeetingPatchTitle] = useState("");
  const [meetingPatchDescription, setMeetingPatchDescription] = useState("");
  const [meetingPatchStartDateTime, setMeetingPatchStartDateTime] = useState("");
  const [meetingPatchEndDateTime, setMeetingPatchEndDateTime] = useState("");
  const [meetingPatchStatus, setMeetingPatchStatus] = useState("Completed");

  const sortedMeetings = useMemo(
    () => sortMeetings(meetings, historySort),
    [meetings, historySort],
  );
  const visibleMeetings = useMemo(
    () => filterMeetings(sortedMeetings, historySearch),
    [historySearch, sortedMeetings],
  );
  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedMeetingId);
  const selectedMeetingFinished = isMeetingFinished(selectedMeeting);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [
        rootResponse,
        meetingsResponse,
        invitationsResponse,
        notificationsResponse,
      ] =
        await Promise.all([
          api.get<string>("/"),
          api.get<Meeting[]>("/meetings"),
          api.get<Invitation[]>(
            `/meetings/invitations/email/${encodeURIComponent(lookupEmail)}`,
          ),
          api.get<AppNotification[]>(
            `/meetings/notifications/email/${encodeURIComponent(lookupEmail)}`,
          ),
        ]);

      setBackendStatus(rootResponse.data || "OK");
      const nextMeetings = sortMeetings(meetingsResponse.data, historySort);
      setMeetings(nextMeetings);
      setInvitations(invitationsResponse.data);
      setNotifications(notificationsResponse.data);

      if (!selectedMeetingId && nextMeetings[0]) {
        setSelectedMeetingId(nextMeetings[0].id);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut incarca datele de test."));
    } finally {
      setIsLoading(false);
    }
  }, [historySort, lookupEmail, selectedMeetingId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAll();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAll]);

  const selectMeeting = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    const meeting = meetings.find((item) => item.id === meetingId);
    if (!meeting) return;

    setMeetingPatchTitle(meeting.title);
    setMeetingPatchDescription(meeting.description ?? "");
    setMeetingPatchStartDateTime(toLocalDateTime(new Date(meeting.startDateTime)));
    setMeetingPatchEndDateTime(toLocalDateTime(new Date(meeting.endDateTime)));
    setMeetingPatchStatus(meeting.status);
    setViewedTranscript(null);
    setAutoImportStatus("");
  };

  const createMeeting = async (event: FormEvent) => {
    event.preventDefault();
    setBusyAction("create");
    setError("");
    setMessage("");

    try {
      const start = fromLocalDateTime(startDateTime);
      const end = fromLocalDateTime(endDateTime);
      if (end <= start) {
        setError("Ora de final trebuie sa fie dupa ora de start.");
        return;
      }

      const response = await api.post<Meeting>("/meetings", {
        ownerId: fallbackOwnerId,
        title,
        description,
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        createGoogleCalendarEvent: createGoogleMeet,
        sendInAppInvitations: true,
        participants: parseParticipants(participants),
      });

      setSelectedMeetingId(response.data.id);
      setMessage(`Meeting creat: ${response.data.id}`);
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut crea meeting-ul."));
    } finally {
      setBusyAction("");
    }
  };

  const runMeetTranscriptImport = useCallback(
    async (meetingId: string, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setBusyAction("import");
        setError("");
        setMessage("");
      }

      let imported = false;

      try {
        const response = await api.post(`/meetings/${meetingId}/import-meet-transcript`);
        setMessage(`Transcript importat: ${JSON.stringify(response.data.source ?? {}, null, 2)}`);
        setAutoImportStatus("Transcript importat si atasat meeting-ului.");
        imported = true;
        await loadAll();
      } catch (requestError) {
        const importError = getApiErrorMessage(
          requestError,
          "Nu am putut importa transcriptul. Meeting-ul trebuie sa fie terminat si transcription activ.",
        );

        if (options?.silent) {
          setAutoImportStatus(importError);
        } else {
          setError(importError);
        }
      } finally {
        if (!options?.silent) {
          setBusyAction("");
        }
      }

      return imported;
    },
    [loadAll],
  );

  useEffect(() => {
    if (!selectedMeeting?.id || !selectedMeeting.googleMeetLink || selectedMeeting.transcriptId) {
      return;
    }

    const tryImport = () => {
      const meetingEnded = Date.now() >= new Date(selectedMeeting.endDateTime).getTime();
      if (!meetingEnded) return;

      setAutoImportStatus("Incerc import automat din Google Meet...");
      void runMeetTranscriptImport(selectedMeeting.id, { silent: true });
    };

    const timeoutId = window.setTimeout(tryImport, 1_000);
    const intervalId = window.setInterval(tryImport, 30_000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [
    runMeetTranscriptImport,
    selectedMeeting?.endDateTime,
    selectedMeeting?.googleMeetLink,
    selectedMeeting?.id,
    selectedMeeting?.transcriptId,
  ]);

  const importMeetTranscript = async () => {
    if (!selectedMeetingId) return;
    await runMeetTranscriptImport(selectedMeetingId);
  };

  const viewTranscript = async () => {
    if (!selectedMeeting?.transcriptId) return;
    setBusyAction("view-transcript");
    setError("");
    setMessage("");

    try {
      const response = await api.get<Transcript>(`/transcripts/${selectedMeeting.transcriptId}`);
      setViewedTranscript(response.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut incarca transcriptul."));
    } finally {
      setBusyAction("");
    }
  };

  const processAiTranscript = async () => {
    if (!selectedMeetingId) return;
    setBusyAction("ai");
    setError("");
    setMessage("");

    try {
      const response = await api.post("/ai/process-transcript", {
        meetingId: selectedMeetingId,
        transcript: aiTranscript,
        fileFormat: "text",
        language: "ro",
      });
      setAiResult(response.data.aiResult ?? response.data);
      setMessage("AI procesat din textul introdus manual.");
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut procesa transcriptul cu AI."));
    } finally {
      setBusyAction("");
    }
  };

  const processAttachedTranscript = async () => {
    if (!selectedMeeting?.transcriptId) return;
    setBusyAction("ai-attached");
    setError("");
    setMessage("");

    try {
      const response = await api.post("/ai/process-transcript", {
        meetingId: selectedMeeting.id,
        transcriptId: selectedMeeting.transcriptId,
        language: "ro",
      });
      setAiResult(response.data.aiResult ?? response.data);
      setMessage("AI procesat automat din transcriptul atasat meeting-ului.");
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut procesa transcriptul atasat."));
    } finally {
      setBusyAction("");
    }
  };

  const getAiStatus = async () => {
    setBusyAction("ai-status");
    setError("");
    setMessage("");

    try {
      const response = await api.get("/ai");
      setMessage(`AI status: ${JSON.stringify(response.data, null, 2)}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut verifica AI status."));
    } finally {
      setBusyAction("");
    }
  };

  const processRawAiTranscript = async () => {
    if (!selectedMeetingId) return;
    setBusyAction("ai-raw");
    setError("");
    setMessage("");

    try {
      const response = await api.post(
        `/ai/process-transcript/raw?meetingId=${encodeURIComponent(selectedMeetingId)}&language=ro&fileFormat=text`,
        aiTranscript,
        { headers: { "Content-Type": "text/plain" } },
      );
      setAiResult(response.data.aiResult ?? response.data);
      setMessage("AI raw procesat.");
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut procesa transcriptul raw."));
    } finally {
      setBusyAction("");
    }
  };

  const updateMeeting = async () => {
    if (!selectedMeetingId) return;
    setBusyAction("meeting-update");
    setError("");
    setMessage("");

    try {
      const start = meetingPatchStartDateTime
        ? fromLocalDateTime(meetingPatchStartDateTime)
        : undefined;
      const end = meetingPatchEndDateTime
        ? fromLocalDateTime(meetingPatchEndDateTime)
        : undefined;
      if (start && end && end <= start) {
        setError("Ora de final trebuie sa fie dupa ora de start.");
        return;
      }

      const response = await api.patch(`/meetings/${selectedMeetingId}`, {
        title: meetingPatchTitle.trim(),
        description: meetingPatchDescription,
        startDateTime: start?.toISOString(),
        endDateTime: end?.toISOString(),
        status: meetingPatchStatus,
      });
      setMessage(`Meeting actualizat: ${JSON.stringify(response.data, null, 2)}`);
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut actualiza meeting-ul."));
    } finally {
      setBusyAction("");
    }
  };

  const deleteMeeting = async () => {
    if (!selectedMeetingId) return;
    setBusyAction("meeting-delete");
    setError("");
    setMessage("");

    try {
      await api.delete(`/meetings/${selectedMeetingId}`);
      setMessage(`Meeting sters: ${selectedMeetingId}`);
      setSelectedMeetingId("");
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut sterge meeting-ul."));
    } finally {
      setBusyAction("");
    }
  };

  const refreshInvitations = async () => {
    setBusyAction("lookup");
    setError("");

    try {
      const [invitationsResponse, notificationsResponse] = await Promise.all([
        api.get<Invitation[]>(`/meetings/invitations/email/${encodeURIComponent(lookupEmail)}`),
        api.get<AppNotification[]>(
          `/meetings/notifications/email/${encodeURIComponent(lookupEmail)}`,
        ),
      ]);
      setInvitations(invitationsResponse.data);
      setNotifications(notificationsResponse.data);
      setMessage(`Date incarcate pentru ${lookupEmail}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut cauta invitatiile."));
    } finally {
      setBusyAction("");
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Test Lab</h1>
            <p className="text-sm text-gray-500">
              Testeaza rapid meeting-uri, invitatii, notificari, transcript si AI.
            </p>
          </div>
          <Button
            variant="secondary"
            leftIcon={<FiRefreshCw />}
            isLoading={isLoading}
            onClick={loadAll}
          >
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card title="Backend">
            <div className="flex items-center gap-2">
              <FiCheckCircle className="text-green-600" />
              <span className="text-sm font-medium text-gray-900">{backendStatus}</span>
            </div>
          </Card>
          <Card title="Meetings">
            <p className="text-2xl font-semibold text-gray-900">{meetings.length}</p>
          </Card>
          <Card title="Invitatii">
            <p className="text-2xl font-semibold text-gray-900">{invitations.length}</p>
          </Card>
          <Card title="Notificari">
            <p className="text-2xl font-semibold text-gray-900">{notifications.length}</p>
          </Card>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <pre className="max-h-52 overflow-auto rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {message}
          </pre>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <Card title="1. Creeaza meeting complet">
            <form className="grid gap-4" onSubmit={createMeeting}>
              <Input
                label="Titlu"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
              <TextArea
                label="Descriere"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Start"
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(event) => setStartDateTime(event.target.value)}
                  required
                />
                <Input
                  label="Final"
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(event) => setEndDateTime(event.target.value)}
                  required
                />
              </div>
              <TextArea
                label="Participanti"
                value={participants}
                onChange={(event) => setParticipants(event.target.value)}
                rows={4}
                hint="Un participant pe linie: email simplu, Nume <email>, sau Nume, email, rol."
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={createGoogleMeet}
                  onChange={(event) => setCreateGoogleMeet(event.target.checked)}
                  className="h-4 w-4"
                />
                Creeaza eveniment Calendar + Google Meet link
              </label>
              <Button type="submit" leftIcon={<FiSend />} isLoading={busyAction === "create"}>
                Creeaza si verifica
              </Button>
            </form>
          </Card>

          <div className="flex flex-col gap-5">
            <Card title="2. Selecteaza meeting">
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Sortare history
                  <select
                    value={historySort}
                    onChange={(event) => setHistorySort(event.target.value as HistorySort)}
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                  >
                    <option value="newest">Cele mai noi primele</option>
                    <option value="oldest">Cele mai vechi primele</option>
                    <option value="status">Dupa status</option>
                  </select>
                </label>
                <SearchBar
                  value={historySearch}
                  onChange={setHistorySearch}
                  placeholder="Cauta in history..."
                />
                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Meeting
                  <select
                    value={selectedMeetingId}
                    onChange={(event) => selectMeeting(event.target.value)}
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                  >
                    <option value="">Alege meeting</option>
                    {visibleMeetings.map((meeting) => (
                      <option key={meeting.id} value={meeting.id}>
                        {meeting.title} - {formatDate(meeting.startDateTime)}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedMeeting && (
                  <div className="rounded-lg border border-gray-100 p-3 text-sm text-gray-600">
                    <p className="font-medium text-gray-900">{selectedMeeting.title}</p>
                    <p>ID: {selectedMeeting.id}</p>
                    <p>Transcript: {selectedMeeting.transcriptId ?? "neatasat"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedMeeting.googleMeetLink && !selectedMeetingFinished && (
                        <a
                          href={selectedMeeting.googleMeetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center text-brand hover:text-brand-dark"
                        >
                          Deschide Meet
                        </a>
                      )}
                      {selectedMeeting.googleMeetLink && selectedMeetingFinished && (
                        <span className="inline-flex h-8 items-center text-gray-500">
                          Meet incheiat
                        </span>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<FiFileText />}
                        disabled={!selectedMeeting.transcriptId}
                        isLoading={busyAction === "view-transcript"}
                        onClick={viewTranscript}
                      >
                        Vezi transcript
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card title="3. Google Meet transcript">
              <div className="grid gap-3">
                <p className="text-sm text-gray-600">
                  Ruleaza dupa ce meeting-ul s-a terminat si transcription a fost pornit in Meet.
                </p>
                <Button
                  leftIcon={<FiDownload />}
                  disabled={!selectedMeetingId}
                  isLoading={busyAction === "import"}
                  onClick={importMeetTranscript}
                >
                  Import transcript
                </Button>
                {selectedMeeting?.googleMeetLink &&
                  !selectedMeeting.transcriptId &&
                  autoImportStatus && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Auto-import: {autoImportStatus}
                    </p>
                  )}
              </div>
            </Card>

            <Card title="4. Invitatii si notificari">
              <div className="grid gap-3">
                <Input
                  label="Email"
                  value={lookupEmail}
                  onChange={(event) => setLookupEmail(event.target.value)}
                />
                <Button
                  variant="secondary"
                  leftIcon={<FiBell />}
                  isLoading={busyAction === "lookup"}
                  onClick={refreshInvitations}
                >
                  Cauta
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <Card title="5. Proceseaza AI pe meeting-ul selectat">
          <div className="grid gap-4">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
              <p className="font-medium text-gray-900">Mod automat</p>
              <p>
                Selecteaza un meeting care are transcript atasat, apoi ruleaza AI fara sa mai
                copiezi textul manual.
              </p>
              <Button
                className="mt-3"
                leftIcon={<FiCpu />}
                disabled={!selectedMeeting?.transcriptId}
                isLoading={busyAction === "ai-attached"}
                onClick={processAttachedTranscript}
              >
                Ruleaza AI din transcript atasat
              </Button>
            </div>
            <TextArea
              label="Transcript pentru AI"
              value={aiTranscript}
              onChange={(event) => setAiTranscript(event.target.value)}
              rows={5}
            />
            <Button
              leftIcon={<FiCpu />}
              disabled={!selectedMeetingId}
              isLoading={busyAction === "ai"}
              onClick={processAiTranscript}
            >
              Ruleaza AI
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                leftIcon={<FiCheckCircle />}
                isLoading={busyAction === "ai-status"}
                onClick={getAiStatus}
              >
                AI status
              </Button>
              <Button
                variant="secondary"
                disabled={!selectedMeetingId}
                isLoading={busyAction === "ai-raw"}
                onClick={processRawAiTranscript}
              >
                Ruleaza raw
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Rezultat AI">
          {aiResult ? (
            <div className="grid gap-4">
              <section>
                <h2 className="mb-2 text-base font-semibold text-gray-900">Summary</h2>
                <p className="text-sm text-gray-700">
                  {aiResult.summary || "AI nu a returnat summary."}
                </p>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div>
                  <h2 className="mb-2 text-base font-semibold text-gray-900">Key points</h2>
                  {aiResult.keyPoints?.length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                      {aiResult.keyPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Fara key points.</p>
                  )}
                </div>

                <div>
                  <h2 className="mb-2 text-base font-semibold text-gray-900">Decisions</h2>
                  {aiResult.decisions?.length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                      {aiResult.decisions.map((decision) => (
                        <li key={decision}>{decision}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Fara decizii.</p>
                  )}
                </div>
              </section>

              <section className="flex flex-wrap gap-2">
                <Badge>
                  Durata: {aiResult.meetingStatistics?.durationMinutes ?? "n/a"} min
                </Badge>
                <Badge>
                  Participanti: {aiResult.meetingStatistics?.participantCount ?? "n/a"}
                </Badge>
                <Badge>
                  Action items: {aiResult.meetingStatistics?.actionItemCount ?? "n/a"}
                </Badge>
                <Badge>
                  Status: {aiResult.meetingStatistics?.processingStatus ?? "n/a"}
                </Badge>
              </section>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Ruleaza AI manual sau automat ca sa vezi rezultatul structurat aici.
            </p>
          )}
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="6. Edit meeting selectat">
            <div className="grid gap-3">
              <Input
                label="Titlu"
                value={meetingPatchTitle}
                onChange={(event) => setMeetingPatchTitle(event.target.value)}
                placeholder={selectedMeeting?.title ?? "Titlu nou"}
              />
              <TextArea
                label="Descriere"
                value={meetingPatchDescription}
                onChange={(event) => setMeetingPatchDescription(event.target.value)}
                rows={3}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Start"
                  type="datetime-local"
                  value={meetingPatchStartDateTime}
                  onChange={(event) => setMeetingPatchStartDateTime(event.target.value)}
                />
                <Input
                  label="Final"
                  type="datetime-local"
                  value={meetingPatchEndDateTime}
                  onChange={(event) => setMeetingPatchEndDateTime(event.target.value)}
                />
              </div>
              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Status
                <select
                  value={meetingPatchStatus}
                  onChange={(event) => setMeetingPatchStatus(event.target.value)}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  leftIcon={<FiEdit3 />}
                  disabled={!selectedMeetingId}
                  isLoading={busyAction === "meeting-update"}
                  onClick={updateMeeting}
                >
                  Update
                </Button>
                <Button
                  variant="danger"
                  leftIcon={<FiTrash2 />}
                  disabled={!selectedMeetingId}
                  isLoading={busyAction === "meeting-delete"}
                  onClick={deleteMeeting}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <Card title="9. Transcript viewer">
          {viewedTranscript ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <Badge>{viewedTranscript.fileFormat}</Badge>
                <span>ID: {viewedTranscript.id}</span>
                <span>Uploaded: {formatDate(viewedTranscript.uploadedAt)}</span>
              </div>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
                {viewedTranscript.content}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Selecteaza un meeting cu transcript si apasa Vezi transcript.
            </p>
          )}
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Meetings">
            <div className="flex max-h-96 flex-col gap-3 overflow-auto">
              <SearchBar
                value={historySearch}
                onChange={setHistorySearch}
                placeholder="Cauta dupa titlu, status, ID..."
              />
              {visibleMeetings.length === 0 ? (
                <p className="rounded-lg border border-gray-100 p-3 text-sm text-gray-500">
                  Nu exista meeting-uri pentru cautarea curenta.
                </p>
              ) : (
                visibleMeetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => selectMeeting(meeting.id)}
                    className="rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-gray-900">{meeting.title}</p>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        <StatusBadge status={meeting.status} />
                        {meeting.aiStatus && meeting.aiStatus !== "Idle" && (
                          <StatusBadge status={meeting.aiStatus} />
                        )}
                        {meeting.aiStatus === "Idle" && <Badge>AI idle</Badge>}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(meeting.startDateTime)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {meeting.attendeeIds?.length ?? 0} participanti,{" "}
                      {meeting.transcriptId ? "transcript atasat" : "fara transcript"},{" "}
                      {isMeetingFinished(meeting) ? "meet incheiat" : "meet activ/programat"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </Card>

          <div className="grid gap-5">
            <Card title="Invitatii">
              <div className="flex max-h-56 flex-col gap-2 overflow-auto">
                {invitations.length === 0 ? (
                  <p className="text-sm text-gray-500">Nu exista invitatii pentru email.</p>
                ) : (
                  invitations.map((invitation) => (
                    <div key={invitation.id} className="rounded-lg border border-gray-100 p-3">
                      <p className="text-sm font-medium text-gray-900">
                        {invitation.invitationStatus}
                      </p>
                      <p className="text-xs text-gray-500">Meeting: {invitation.meetingId}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card title="Notificari">
              <div className="flex max-h-56 flex-col gap-2 overflow-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500">Nu exista notificari pentru email.</p>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className="rounded-lg border border-gray-100 p-3">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

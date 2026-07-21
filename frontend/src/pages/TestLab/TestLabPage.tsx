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
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { Badge, Button, Card, Input, TextArea } from "../../components/atoms";
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

interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  isVerified?: boolean;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  roleInMeeting: string;
  attendanceStatus: string;
}

interface Transcript {
  id: string;
  meetingId: string;
  content: string;
  fileFormat: string;
  uploadedAt: string;
}

const toLocalDateTime = (date: Date) => date.toISOString().slice(0, 16);

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
  const [users, setUsers] = useState<AppUser[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [lookupEmail, setLookupEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [viewedTranscript, setViewedTranscript] = useState<Transcript | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");

  const [title, setTitle] = useState("Test Google Meet transcript");
  const [description, setDescription] = useState("Meeting creat din pagina de test.");
  const [startDateTime, setStartDateTime] = useState(defaultStartDateTime);
  const [endDateTime, setEndDateTime] = useState(defaultEndDateTime);
  const [createGoogleMeet, setCreateGoogleMeet] = useState(true);
  const [participants, setParticipants] = useState(`${defaultEmail}`);
  const [transcript, setTranscript] = useState(
    "Alex: Testam crearea transcriptului direct din aplicatie.\nMaria: Confirm ca meeting-ul apare in history.",
  );
  const [aiTranscript, setAiTranscript] = useState(
    "Alex: Pregatesc integrarea cu Google Meet pana joi.\nMaria: Eu verific notificarile si invitatiile.",
  );
  const [userFirstName, setUserFirstName] = useState("Test");
  const [userLastName, setUserLastName] = useState("User");
  const [userEmail, setUserEmail] = useState(
    () => `test-${Date.now()}@example.com`,
  );
  const [userPassword, setUserPassword] = useState("Password123!");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [attendeeName, setAttendeeName] = useState("Participant Test");
  const [attendeeEmail, setAttendeeEmail] = useState(
    () => `participant-${Date.now()}@example.com`,
  );
  const [attendeeRole, setAttendeeRole] = useState("Tester");
  const [selectedAttendeeId, setSelectedAttendeeId] = useState("");
  const [meetingPatchTitle, setMeetingPatchTitle] = useState("");
  const [meetingPatchDescription, setMeetingPatchDescription] = useState("");
  const [meetingPatchStartDateTime, setMeetingPatchStartDateTime] = useState("");
  const [meetingPatchEndDateTime, setMeetingPatchEndDateTime] = useState("");
  const [meetingPatchStatus, setMeetingPatchStatus] = useState("Completed");

  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedMeetingId);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [
        rootResponse,
        meetingsResponse,
        invitationsResponse,
        notificationsResponse,
        usersResponse,
        attendeesResponse,
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
          api.get<AppUser[]>("/users"),
          api.get<Attendee[]>("/attendees"),
        ]);

      setBackendStatus(rootResponse.data || "OK");
      setMeetings(meetingsResponse.data);
      setInvitations(invitationsResponse.data);
      setNotifications(notificationsResponse.data);
      setUsers(usersResponse.data);
      setAttendees(attendeesResponse.data);

      if (!selectedMeetingId && meetingsResponse.data[0]) {
        setSelectedMeetingId(meetingsResponse.data[0].id);
      }
      if (!selectedUserId && usersResponse.data[0]) {
        setSelectedUserId(usersResponse.data[0].id);
      }
      if (!selectedAttendeeId && attendeesResponse.data[0]) {
        setSelectedAttendeeId(attendeesResponse.data[0].id);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut incarca datele de test."));
    } finally {
      setIsLoading(false);
    }
  }, [lookupEmail, selectedAttendeeId, selectedMeetingId, selectedUserId]);

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
  };

  const createMeeting = async (event: FormEvent) => {
    event.preventDefault();
    setBusyAction("create");
    setError("");
    setMessage("");

    try {
      const response = await api.post<Meeting>("/meetings", {
        ownerId: fallbackOwnerId,
        title,
        description,
        startDateTime: new Date(startDateTime).toISOString(),
        endDateTime: new Date(endDateTime).toISOString(),
        createGoogleCalendarEvent: createGoogleMeet,
        sendInAppInvitations: true,
        participants: parseParticipants(participants),
        transcript: transcript.trim() || undefined,
        transcriptFileFormat: "text",
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

  const importMeetTranscript = async () => {
    if (!selectedMeetingId) return;
    setBusyAction("import");
    setError("");
    setMessage("");

    try {
      const response = await api.post(`/meetings/${selectedMeetingId}/import-meet-transcript`);
      setMessage(`Transcript importat: ${JSON.stringify(response.data.source ?? {}, null, 2)}`);
      await loadAll();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Nu am putut importa transcriptul. Meeting-ul trebuie sa fie terminat si transcription activ.",
        ),
      );
    } finally {
      setBusyAction("");
    }
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
      setMessage(`AI procesat: ${JSON.stringify(response.data.aiResult ?? response.data, null, 2)}`);
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut procesa transcriptul cu AI."));
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
      setMessage(`AI raw procesat: ${JSON.stringify(response.data.aiResult ?? response.data, null, 2)}`);
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
      const response = await api.patch(`/meetings/${selectedMeetingId}`, {
        title: meetingPatchTitle.trim(),
        description: meetingPatchDescription,
        startDateTime: meetingPatchStartDateTime
          ? new Date(meetingPatchStartDateTime).toISOString()
          : undefined,
        endDateTime: meetingPatchEndDateTime
          ? new Date(meetingPatchEndDateTime).toISOString()
          : undefined,
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

  const createUser = async () => {
    setBusyAction("user-create");
    setError("");
    setMessage("");

    try {
      const response = await api.post<AppUser>("/users", {
        firstName: userFirstName,
        lastName: userLastName,
        email: userEmail,
        passwordHash: userPassword,
      });
      setSelectedUserId(response.data.id);
      setMessage(`User creat: ${JSON.stringify(response.data, null, 2)}`);
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut crea user-ul."));
    } finally {
      setBusyAction("");
    }
  };

  const updateUser = async () => {
    if (!selectedUserId) return;
    setBusyAction("user-update");
    setError("");
    setMessage("");

    try {
      const response = await api.patch<AppUser>(`/users/${selectedUserId}`, {
        firstName: userFirstName,
        lastName: userLastName,
      });
      setMessage(`User actualizat: ${JSON.stringify(response.data, null, 2)}`);
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut actualiza user-ul."));
    } finally {
      setBusyAction("");
    }
  };

  const deleteUser = async () => {
    if (!selectedUserId) return;
    setBusyAction("user-delete");
    setError("");
    setMessage("");

    try {
      await api.delete(`/users/${selectedUserId}`);
      setMessage(`User sters: ${selectedUserId}`);
      setSelectedUserId("");
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut sterge user-ul."));
    } finally {
      setBusyAction("");
    }
  };

  const createAttendee = async () => {
    setBusyAction("attendee-create");
    setError("");
    setMessage("");

    try {
      const response = await api.post<Attendee>("/attendees", {
        name: attendeeName,
        email: attendeeEmail,
        roleInMeeting: attendeeRole,
      });
      setSelectedAttendeeId(response.data.id);
      setMessage(`Participant creat: ${JSON.stringify(response.data, null, 2)}`);
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut crea participantul."));
    } finally {
      setBusyAction("");
    }
  };

  const updateAttendee = async () => {
    if (!selectedAttendeeId) return;
    setBusyAction("attendee-update");
    setError("");
    setMessage("");

    try {
      const response = await api.patch<Attendee>(`/attendees/${selectedAttendeeId}`, {
        name: attendeeName,
        roleInMeeting: attendeeRole,
        attendanceStatus: "Acceptat",
      });
      setMessage(`Participant actualizat: ${JSON.stringify(response.data, null, 2)}`);
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut actualiza participantul."));
    } finally {
      setBusyAction("");
    }
  };

  const deleteAttendee = async () => {
    if (!selectedAttendeeId) return;
    setBusyAction("attendee-delete");
    setError("");
    setMessage("");

    try {
      await api.delete(`/attendees/${selectedAttendeeId}`);
      setMessage(`Participant sters: ${selectedAttendeeId}`);
      setSelectedAttendeeId("");
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut sterge participantul."));
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
              <TextArea
                label="Transcript manual"
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                rows={5}
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
                  Meeting
                  <select
                    value={selectedMeetingId}
                    onChange={(event) => selectMeeting(event.target.value)}
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                  >
                    <option value="">Alege meeting</option>
                    {meetings.map((meeting) => (
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
                      {selectedMeeting.googleMeetLink && (
                        <a
                          href={selectedMeeting.googleMeetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center text-brand hover:text-brand-dark"
                        >
                          Deschide Meet
                        </a>
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

        <div className="grid gap-5 xl:grid-cols-3">
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

          <Card title="7. Users CRUD">
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Prenume"
                  value={userFirstName}
                  onChange={(event) => setUserFirstName(event.target.value)}
                />
                <Input
                  label="Nume"
                  value={userLastName}
                  onChange={(event) => setUserLastName(event.target.value)}
                />
              </div>
              <Input
                label="Email"
                value={userEmail}
                onChange={(event) => setUserEmail(event.target.value)}
              />
              <Input
                label="Parola/Hash test"
                value={userPassword}
                onChange={(event) => setUserPassword(event.target.value)}
              />
              <label className="grid gap-1 text-sm font-medium text-gray-700">
                User existent
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                >
                  <option value="">Alege user</option>
                  {users.map((appUser) => (
                    <option key={appUser.id} value={appUser.id}>
                      {appUser.email}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  leftIcon={<FiUserPlus />}
                  isLoading={busyAction === "user-create"}
                  onClick={createUser}
                >
                  Create
                </Button>
                <Button
                  variant="secondary"
                  disabled={!selectedUserId}
                  isLoading={busyAction === "user-update"}
                  onClick={updateUser}
                >
                  Update
                </Button>
                <Button
                  variant="danger"
                  disabled={!selectedUserId}
                  isLoading={busyAction === "user-delete"}
                  onClick={deleteUser}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>

          <Card title="8. Attendees CRUD">
            <div className="grid gap-3">
              <Input
                label="Nume"
                value={attendeeName}
                onChange={(event) => setAttendeeName(event.target.value)}
              />
              <Input
                label="Email"
                value={attendeeEmail}
                onChange={(event) => setAttendeeEmail(event.target.value)}
              />
              <Input
                label="Rol"
                value={attendeeRole}
                onChange={(event) => setAttendeeRole(event.target.value)}
              />
              <label className="grid gap-1 text-sm font-medium text-gray-700">
                Participant existent
                <select
                  value={selectedAttendeeId}
                  onChange={(event) => setSelectedAttendeeId(event.target.value)}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                >
                  <option value="">Alege participant</option>
                  {attendees.map((attendee) => (
                    <option key={attendee.id} value={attendee.id}>
                      {attendee.email}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  leftIcon={<FiUsers />}
                  isLoading={busyAction === "attendee-create"}
                  onClick={createAttendee}
                >
                  Create
                </Button>
                <Button
                  variant="secondary"
                  disabled={!selectedAttendeeId}
                  isLoading={busyAction === "attendee-update"}
                  onClick={updateAttendee}
                >
                  Update
                </Button>
                <Button
                  variant="danger"
                  disabled={!selectedAttendeeId}
                  isLoading={busyAction === "attendee-delete"}
                  onClick={deleteAttendee}
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
              {meetings.map((meeting) => (
                <button
                  key={meeting.id}
                  type="button"
                  onClick={() => selectMeeting(meeting.id)}
                  className="rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-gray-900">{meeting.title}</p>
                    <Badge>{meeting.aiStatus ?? meeting.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{formatDate(meeting.startDateTime)}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {meeting.attendeeIds?.length ?? 0} participanti,{" "}
                    {meeting.transcriptId ? "transcript atasat" : "fara transcript"}
                  </p>
                </button>
              ))}
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

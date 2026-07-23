import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  FiBell,
  FiCheckCircle,
  FiCpu,
  FiDownload,
  FiEdit3,
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiSend,
  FiTrash2,
} from "react-icons/fi";
import { Badge, Button, Card, Input, TextArea } from "../../components/atoms";
import { SearchBar, StatusBadge } from "../../components/molecules/common";
import { AppLayout } from "../../components/templates";
import { useGoogleConnectionStatus } from "../../hooks/useGoogleConnectionStatus";
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
  aiResultId?: string;
  attendeeIds?: string[];
  invitationIds?: string[];
  notificationIds?: string[];
  actionItemsCount?: number;
}

interface MeetingHistoryResponse {
  items: Meeting[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
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

interface AiSummaryResponse {
  aiResultId: string;
  meetingId: string;
  summary: string;
  generatedAt?: string;
}

interface AiKeyPointsResponse {
  aiResultId: string;
  meetingId: string;
  keyPoints: string[];
}

interface AiDecisionsResponse {
  aiResultId: string;
  meetingId: string;
  decisions: string[];
}

interface AiActionItem {
  id: string;
  task: string;
  responsiblePerson: string;
  dueDate?: string;
  status: string;
  confidenceScore?: number;
  meetingId: string;
  meetingTitle: string;
}

interface AiActionItemsResponse {
  aiResultId: string;
  meetingId: string;
  meetingTitle: string;
  actionItems: AiActionItem[];
}

type ProcessAiActionItem = Omit<AiActionItem, "meetingId" | "meetingTitle"> &
  Partial<Pick<AiActionItem, "meetingId" | "meetingTitle">>;

interface ProcessAiResponse extends AiResult {
  meetingId?: string;
  transcript?: Transcript;
  aiResult?: AiResult;
  actionItems?: ProcessAiActionItem[];
}

type HistorySort = "newest" | "oldest" | "status";

interface MeetingParticipantInput {
  name: string;
  email: string;
  roleInMeeting: string;
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const HISTORY_PAGE_SIZE = 5;

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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function uniqueParticipants(participants: MeetingParticipantInput[]) {
  const seen = new Set<string>();

  return participants.filter((participant) => {
    const email = participant.email.toLowerCase().trim();
    if (seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

function formatParticipantForText(participant: MeetingParticipantInput) {
  const name = participant.name.trim();
  const email = participant.email.toLowerCase().trim();
  const role = participant.roleInMeeting.trim();

  if (role && role !== "Participant") {
    return `${name || email}, ${email}, ${role}`;
  }

  return name && name !== email ? `${name} <${email}>` : email;
}

function parseParticipantLine(line: string): MeetingParticipantInput[] {
  const bracketMatch = line.match(/^(.*?)\s*<([^>]+)>$/);
  if (bracketMatch && isValidEmail(bracketMatch[2])) {
    const email = bracketMatch[2].trim().toLowerCase();
    return [
      {
        name: bracketMatch[1].trim() || email,
        email,
        roleInMeeting: "Participant",
      },
    ];
  }

  const emails = Array.from(line.matchAll(EMAIL_PATTERN), (match) => match[0].toLowerCase());
  if (emails.length > 1) {
    return emails.map((email) => ({
      name: email,
      email,
      roleInMeeting: "Participant",
    }));
  }

  const [nameOrEmail, email, roleInMeeting] = line.split(",").map((part) => part.trim());
  if (email && isValidEmail(email)) {
    return [
      {
        name: nameOrEmail || email,
        email: email.toLowerCase(),
        roleInMeeting: roleInMeeting || "Participant",
      },
    ];
  }

  if (isValidEmail(nameOrEmail)) {
    const normalizedEmail = nameOrEmail.toLowerCase();
    return [
      {
        name: normalizedEmail,
        email: normalizedEmail,
        roleInMeeting: "Participant",
      },
    ];
  }

  return [];
}

function parseParticipants(raw: string) {
  return uniqueParticipants(
    raw
    .split(/\r?\n/)
      .flatMap((line) => line.split(";"))
    .map((line) => line.trim())
    .filter(Boolean)
      .flatMap(parseParticipantLine),
  );
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
  return meeting.status === "Completed";
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
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPageCount, setHistoryPageCount] = useState(1);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [lookupEmail, setLookupEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [viewedTranscript, setViewedTranscript] = useState<Transcript | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryResponse | null>(null);
  const [aiKeyPoints, setAiKeyPoints] = useState<AiKeyPointsResponse | null>(null);
  const [aiDecisions, setAiDecisions] = useState<AiDecisionsResponse | null>(null);
  const [aiActionItems, setAiActionItems] = useState<AiActionItemsResponse | null>(null);
  const [autoImportStatus, setAutoImportStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const { connected: googleConnected, loading: googleStatusLoading } =
    useGoogleConnectionStatus();

  const [title, setTitle] = useState("Test Google Meet transcript");
  const [description, setDescription] = useState("Meeting creat din pagina de test.");
  const [startDateTime, setStartDateTime] = useState(defaultStartDateTime);
  const [endDateTime, setEndDateTime] = useState(defaultEndDateTime);
  const [createGoogleMeet, setCreateGoogleMeet] = useState(true);
  const [participants, setParticipants] = useState(`${defaultEmail}`);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Participant");
  const [aiTranscript, setAiTranscript] = useState(
    "Alex: Pregatesc integrarea cu Google Meet pana joi.\nMaria: Eu verific notificarile si invitatiile.",
  );
  const [meetingPatchTitle, setMeetingPatchTitle] = useState("");
  const [meetingPatchDescription, setMeetingPatchDescription] = useState("");
  const [meetingPatchStartDateTime, setMeetingPatchStartDateTime] = useState("");
  const [meetingPatchEndDateTime, setMeetingPatchEndDateTime] = useState("");
  const [meetingPatchStatus, setMeetingPatchStatus] = useState("Completed");
  const [newInvitees, setNewInvitees] = useState("");

  const parsedParticipants = useMemo(() => parseParticipants(participants), [participants]);
  const parsedNewInvitees = useMemo(() => parseParticipants(newInvitees), [newInvitees]);
  const safeHistoryPage = Math.min(historyPage, historyPageCount);
  const visibleMeetings = meetings;
  const paginatedMeetings = meetings;
  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedMeetingId);
  const selectedMeetingFinished = isMeetingFinished(selectedMeeting);
  const selectedAiResultId = selectedMeeting?.aiResultId ?? aiResult?.id;

  const hydrateSeparateAiResults = (
    responseData: ProcessAiResponse,
    meeting?: Meeting,
  ): AiResult => {
    const result = responseData.aiResult ?? responseData;
    const meetingId = responseData.meetingId ?? meeting?.id ?? "";
    const meetingTitle = meeting?.title ?? "Meeting selectat";
    const aiResultId = result.id ?? "";

    if (aiResultId) {
      setAiSummary({
        aiResultId,
        meetingId,
        summary: result.summary ?? "",
      });
      setAiKeyPoints({
        aiResultId,
        meetingId,
        keyPoints: result.keyPoints ?? [],
      });
      setAiDecisions({
        aiResultId,
        meetingId,
        decisions: result.decisions ?? [],
      });
      setAiActionItems({
        aiResultId,
        meetingId,
        meetingTitle,
        actionItems: (responseData.actionItems ?? []).map((item) => ({
          ...item,
          meetingId: item.meetingId ?? meetingId,
          meetingTitle: item.meetingTitle ?? meetingTitle,
        })),
      });
    }

    return result;
  };

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
          api.get<MeetingHistoryResponse>("/meetings/history", {
            params: {
              page: historyPage,
              pageSize: HISTORY_PAGE_SIZE,
              search: historySearch || undefined,
              sort: historySort,
            },
          }),
          api.get<Invitation[]>(
            `/meetings/invitations/email/${encodeURIComponent(lookupEmail)}`,
          ),
          api.get<AppNotification[]>(
            `/meetings/notifications/email/${encodeURIComponent(lookupEmail)}`,
          ),
        ]);

      setBackendStatus(rootResponse.data || "OK");
      const nextMeetings = meetingsResponse.data.items;
      setMeetings(nextMeetings);
      setHistoryTotal(meetingsResponse.data.total);
      setHistoryPageCount(meetingsResponse.data.pageCount);
      setHistoryPage(meetingsResponse.data.page);
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
  }, [historyPage, historySearch, historySort, lookupEmail, selectedMeetingId]);

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
    setAiResult(null);
    setAiSummary(null);
    setAiKeyPoints(null);
    setAiDecisions(null);
    setAiActionItems(null);
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
      if (participants.trim() && parsedParticipants.length === 0) {
        setError("Adauga cel putin un email valid la participanti.");
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
        participants: parsedParticipants,
      });

      setSelectedMeetingId(response.data.id);
      setMessage(
        [
          `Meeting creat: ${response.data.id}`,
          parsedParticipants.length
            ? `Invitatii trimise catre: ${parsedParticipants
                .map((participant) => participant.email)
                .join(", ")}`
            : "Meeting creat fara participanti invitati.",
        ].join("\n"),
      );
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut crea meeting-ul."));
    } finally {
      setBusyAction("");
    }
  };

  const addParticipantBeforeCreate = () => {
    const email = inviteEmail.toLowerCase().trim();
    if (!isValidEmail(email)) {
      setError("Introdu un email valid pentru invitat.");
      return;
    }

    const participant = {
      name: inviteName.trim() || email,
      email,
      roleInMeeting: inviteRole.trim() || "Participant",
    };
    const nextParticipants = uniqueParticipants([...parsedParticipants, participant]);

    setParticipants(nextParticipants.map(formatParticipantForText).join("\n"));
    setInviteName("");
    setInviteEmail("");
    setInviteRole("Participant");
    setError("");
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
      const response = await api.post<ProcessAiResponse>("/ai/process-transcript", {
        meetingId: selectedMeetingId,
        transcript: aiTranscript,
        fileFormat: "text",
        language: "ro",
      });
      setAiResult(hydrateSeparateAiResults(response.data, selectedMeeting));
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
      const response = await api.post<ProcessAiResponse>("/ai/process-transcript", {
        meetingId: selectedMeeting.id,
        transcriptId: selectedMeeting.transcriptId,
        language: "ro",
      });
      setAiResult(hydrateSeparateAiResults(response.data, selectedMeeting));
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
      const response = await api.post<ProcessAiResponse>(
        `/ai/process-transcript/raw?meetingId=${encodeURIComponent(selectedMeetingId)}&language=ro&fileFormat=text`,
        aiTranscript,
        { headers: { "Content-Type": "text/plain" } },
      );
      setAiResult(hydrateSeparateAiResults(response.data, selectedMeeting));
      setMessage("AI raw procesat.");
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut procesa transcriptul raw."));
    } finally {
      setBusyAction("");
    }
  };

  const loadSeparateAiResult = async (section: "summary" | "key-points" | "decisions" | "action-items") => {
    if (!selectedAiResultId) return;
    setBusyAction(`ai-${section}`);
    setError("");
    setMessage("");

    try {
      if (section === "summary") {
        const response = await api.get<AiSummaryResponse>(`/ai/results/${selectedAiResultId}/summary`);
        setAiSummary(response.data);
      }
      if (section === "key-points") {
        const response = await api.get<AiKeyPointsResponse>(
          `/ai/results/${selectedAiResultId}/key-points`,
        );
        setAiKeyPoints(response.data);
      }
      if (section === "decisions") {
        const response = await api.get<AiDecisionsResponse>(
          `/ai/results/${selectedAiResultId}/decisions`,
        );
        setAiDecisions(response.data);
      }
      if (section === "action-items") {
        const response = await api.get<AiActionItemsResponse>(
          `/ai/results/${selectedAiResultId}/action-items`,
        );
        setAiActionItems(response.data);
      }
      setMessage(`Sectiune AI incarcata separat: ${section}`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut incarca sectiunea AI."));
    } finally {
      setBusyAction("");
    }
  };

  const loadAllSeparateAiResults = async () => {
    if (!selectedAiResultId) return;
    setBusyAction("ai-separate-all");
    setError("");
    setMessage("");

    try {
      const [summaryResponse, keyPointsResponse, decisionsResponse, actionItemsResponse] =
        await Promise.all([
          api.get<AiSummaryResponse>(`/ai/results/${selectedAiResultId}/summary`),
          api.get<AiKeyPointsResponse>(`/ai/results/${selectedAiResultId}/key-points`),
          api.get<AiDecisionsResponse>(`/ai/results/${selectedAiResultId}/decisions`),
          api.get<AiActionItemsResponse>(`/ai/results/${selectedAiResultId}/action-items`),
        ]);

      setAiSummary(summaryResponse.data);
      setAiKeyPoints(keyPointsResponse.data);
      setAiDecisions(decisionsResponse.data);
      setAiActionItems(actionItemsResponse.data);
      setMessage("Toate sectiunile AI au fost incarcate separat.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut incarca rezultatele AI separate."));
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

  const sendAdditionalInvitations = async () => {
    if (!selectedMeetingId) return;
    setBusyAction("meeting-invite");
    setError("");
    setMessage("");

    try {
      if (newInvitees.trim() && parsedNewInvitees.length === 0) {
        setError("Adauga cel putin un email valid pentru invitatii noi.");
        return;
      }

      const response = await api.post(`/meetings/${selectedMeetingId}/invitations`, {
        participants: parsedNewInvitees,
      });
      const invitedEmails =
        response.data.invitations?.map((invitation: Invitation) => invitation.participantEmail) ??
        [];
      const skippedEmails = response.data.skippedEmails ?? [];

      setMessage(
        [
          invitedEmails.length
            ? `Invitatii noi trimise catre: ${invitedEmails.join(", ")}`
            : "Nu s-au trimis invitatii noi.",
          skippedEmails.length ? `Deja invitati: ${skippedEmails.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      setNewInvitees("");
      await loadAll();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Nu am putut trimite invitatiile noi."));
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
            <p className="text-2xl font-semibold text-gray-900">{historyTotal}</p>
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

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <Card title="1. Creeaza meeting complet" className="min-w-0">
            <form className="grid gap-4" onSubmit={createMeeting}>
              <Input
                label="Titlu"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full"
                required
              />
              <TextArea
                label="Descriere"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
              />
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <Input
                  label="Start"
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(event) => setStartDateTime(event.target.value)}
                  className="w-full"
                  required
                />
                <Input
                  label="Final"
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(event) => setEndDateTime(event.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">Invitat nou</p>
                <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]">
                  <Input
                    label="Nume"
                    value={inviteName}
                    onChange={(event) => setInviteName(event.target.value)}
                    placeholder="Alex Popescu"
                    className="w-full"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="alex@example.com"
                    className="w-full"
                  />
                  <Input
                    label="Rol"
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value)}
                    placeholder="Participant"
                    className="w-full"
                  />
                  <Button
                    type="button"
                    className="self-end"
                    variant="secondary"
                    leftIcon={<FiPlus />}
                    onClick={addParticipantBeforeCreate}
                  >
                    Adauga
                  </Button>
                </div>
              </div>
              <TextArea
                label="Lista invitati"
                value={participants}
                onChange={(event) => setParticipants(event.target.value)}
                rows={4}
                hint="Accepta email simplu, mai multe email-uri separate prin virgula/punct si virgula, Nume <email>, sau Nume, email, rol."
              />
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                <p className="font-medium text-gray-900">
                  Invitatii pregatite: {parsedParticipants.length}
                </p>
                {parsedParticipants.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {parsedParticipants.map((participant) => (
                      <Badge key={participant.email}>
                        {participant.name} - {participant.email}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Adauga email-uri valide ca sa se creeze invitatii in aplicatie.
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={createGoogleMeet && googleConnected}
                  disabled={!googleConnected || googleStatusLoading}
                  onChange={(event) => setCreateGoogleMeet(event.target.checked)}
                  className="h-4 w-4"
                />
                Creeaza eveniment Calendar + Google Meet link
              </label>
              {!googleStatusLoading && !googleConnected && (
                <p className="text-xs text-amber-600">
                  Trebuie să conectezi contul Google din{" "}
                  <Link to="/settings" className="link-underline">
                    Setări
                  </Link>{" "}
                  ca să poți crea evenimente Google Meet.
                </p>
              )}
              <Button type="submit" leftIcon={<FiSend />} isLoading={busyAction === "create"}>
                Creeaza si verifica
              </Button>
            </form>
          </Card>

          <div className="flex min-w-0 flex-col gap-5">
            <Card title="2. Selecteaza meeting" className="min-w-0">
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Sortare history
                  <select
                    value={historySort}
                    onChange={(event) => {
                      setHistorySort(event.target.value as HistorySort);
                      setHistoryPage(1);
                    }}
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                  >
                    <option value="newest">Cele mai noi primele</option>
                    <option value="oldest">Cele mai vechi primele</option>
                    <option value="status">Dupa status</option>
                  </select>
                </label>
                <SearchBar
                  value={historySearch}
                  onChange={(value) => {
                    setHistorySearch(value);
                    setHistoryPage(1);
                  }}
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
                    <p>AI result: {selectedMeeting.aiResultId ?? aiResult?.id ?? "neatasat"}</p>
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
                      Transcript: {autoImportStatus}
                    </p>
                  )}
              </div>
            </Card>

            <Card title="4. Invitatii si notificari">
              <div className="grid gap-3">
                <Input
                  label="Email cont curent"
                  value={lookupEmail}
                  onChange={(event) => setLookupEmail(event.target.value)}
                  readOnly
                />
                <p className="text-xs text-gray-500">
                  Aici vezi doar invitatiile primite de contul logat. Persoanele invitate le vad
                  cand intra in aplicatie cu email-ul lor.
                </p>
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
              {selectedMeeting?.aiStatus === "Failed" && (
                <Button
                  variant="danger"
                  disabled={!selectedMeeting.transcriptId}
                  isLoading={busyAction === "ai-attached"}
                  onClick={processAttachedTranscript}
                >
                  Retry AI
                </Button>
              )}
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

        <Card title="Rezultate AI separate">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>AI result: {selectedAiResultId ?? "neatasat"}</Badge>
              <Button
                variant="secondary"
                size="sm"
                disabled={!selectedAiResultId}
                isLoading={busyAction === "ai-separate-all"}
                onClick={loadAllSeparateAiResults}
              >
                Incarca toate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!selectedAiResultId}
                isLoading={busyAction === "ai-summary"}
                onClick={() => loadSeparateAiResult("summary")}
              >
                Summary
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!selectedAiResultId}
                isLoading={busyAction === "ai-key-points"}
                onClick={() => loadSeparateAiResult("key-points")}
              >
                Key points
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!selectedAiResultId}
                isLoading={busyAction === "ai-decisions"}
                onClick={() => loadSeparateAiResult("decisions")}
              >
                Decisions
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!selectedAiResultId}
                isLoading={busyAction === "ai-action-items"}
                onClick={() => loadSeparateAiResult("action-items")}
              >
                Action items
              </Button>
            </div>

            {!selectedAiResultId && (
              <p className="text-sm text-gray-500">
                Ruleaza AI pe meeting-ul selectat sau selecteaza un meeting care are aiResultId.
              </p>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-lg border border-gray-100 p-3">
                <h2 className="mb-2 text-base font-semibold text-gray-900">Summary separat</h2>
                <p className="text-sm text-gray-700">
                  {aiSummary?.summary ?? "Nu este incarcat inca."}
                </p>
              </section>

              <section className="rounded-lg border border-gray-100 p-3">
                <h2 className="mb-2 text-base font-semibold text-gray-900">Key points separat</h2>
                {aiKeyPoints?.keyPoints.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {aiKeyPoints.keyPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Nu sunt incarcate inca.</p>
                )}
              </section>

              <section className="rounded-lg border border-gray-100 p-3">
                <h2 className="mb-2 text-base font-semibold text-gray-900">Decisions separat</h2>
                {aiDecisions?.decisions.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {aiDecisions.decisions.map((decision) => (
                      <li key={decision}>{decision}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Nu sunt incarcate inca.</p>
                )}
              </section>

              <section className="rounded-lg border border-gray-100 p-3">
                <h2 className="mb-2 text-base font-semibold text-gray-900">Action items separat</h2>
                {aiActionItems?.actionItems.length ? (
                  <div className="grid gap-2">
                    {aiActionItems.actionItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm md:grid-cols-[minmax(0,1fr)_130px_110px]"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{item.task}</p>
                          <p className="text-xs text-gray-500">{item.meetingTitle}</p>
                        </div>
                        <span className="text-gray-700">{item.responsiblePerson}</span>
                        <Badge>{item.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nu sunt incarcate inca.</p>
                )}
              </section>
            </div>
          </div>
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
              <div className="mt-2 border-t border-gray-100 pt-4">
                <TextArea
                  label="Invitatii noi"
                  value={newInvitees}
                  onChange={(event) => setNewInvitees(event.target.value)}
                  rows={3}
                  hint="Adauga email-uri noi pentru meeting-ul selectat. Persoanele deja invitate sunt sarite."
                />
                <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">
                    Invitatii noi pregatite: {parsedNewInvitees.length}
                  </p>
                  {parsedNewInvitees.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {parsedNewInvitees.map((participant) => (
                        <Badge key={participant.email}>{participant.email}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  className="mt-3"
                  leftIcon={<FiSend />}
                  disabled={!selectedMeetingId || parsedNewInvitees.length === 0}
                  isLoading={busyAction === "meeting-invite"}
                  onClick={sendAdditionalInvitations}
                >
                  Trimite invitatii noi
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
                onChange={(value) => {
                  setHistorySearch(value);
                  setHistoryPage(1);
                }}
                placeholder="Cauta dupa titlu, status, ID..."
              />
              {visibleMeetings.length === 0 ? (
                <p className="rounded-lg border border-gray-100 p-3 text-sm text-gray-500">
                  Nu exista meeting-uri pentru cautarea curenta.
                </p>
              ) : (
                <>
                  {paginatedMeetings.map((meeting) => (
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
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-sm text-gray-600">
                    <span>
                      Pagina {safeHistoryPage} din {historyPageCount} ({historyTotal}{" "}
                      rezultate)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={safeHistoryPage === 1}
                        onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                      >
                        Inapoi
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={safeHistoryPage === historyPageCount}
                        onClick={() =>
                          setHistoryPage((page) => Math.min(historyPageCount, page + 1))
                        }
                      >
                        Inainte
                      </Button>
                    </div>
                  </div>
                </>
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

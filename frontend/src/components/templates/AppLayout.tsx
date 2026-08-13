import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiBell,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiMenu,
  FiPlus,
  FiSearch,
  FiUserCheck,
  FiX,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";
import { Avatar, Button, Loader } from "../atoms";
import { Modal, ThemeToggle } from "../molecules";
import { MeetingForm, type MeetingFormValues } from "../organisms/meeting";
import { useMeetingsStore } from "../../stores/meetingsStore";
import { useGoogleConnectionStatus } from "../../hooks/useGoogleConnectionStatus";
import { processTranscript, uploadTranscriptFile } from "../../services/ai";
import { API_BASE_URL } from "../../services/api";
import { clearAuthSession, getAccessToken, isAccessTokenValid } from "../../services/authSession";
import { getMeeting } from "../../services/meetings";
import {
  listInvitations,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  respondToInvitation,
} from "../../services/notifications";
import { getFriendlyApiError } from "../../services/apiErrors";
import type { Invitation, Meeting, Notification } from "../../types";
import { useRealtimeConnection, useRealtimeEvent } from "../../hooks/useRealtime";
import { formatDateTime } from "../../utils/date";

export interface AppLayoutProps {
  children: ReactNode;
}

const LABEL_TRANSITION =
  "inline-block origin-left overflow-hidden whitespace-nowrap transition-all duration-200";

function labelClasses(collapsed: boolean, maxWidth = "max-w-[140px]") {
  // Base classes always show the label (mobile drawer is never "collapsed" -
  // that's a desktop-only concept), collapse is applied only at md: and up.
  return `${LABEL_TRANSITION} ml-2 ${maxWidth} scale-x-100 opacity-100 ${
    collapsed ? `md:ml-0 md:max-w-0 md:scale-x-0 md:opacity-0` : `md:ml-2 md:${maxWidth} md:scale-x-100 md:opacity-100`
  }`;
}

const NAV_ITEMS = [
  {
    label: "Meetings",
    to: "/meetings",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Action Items",
    to: "/action-items",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6l1.5 1.5L8 5" />
        <path d="M4 12l1.5 1.5L8 11" />
        <path d="M4 18l1.5 1.5L8 16" />
        <path d="M12 6h9" />
        <path d="M12 12h9" />
        <path d="M12 18h9" />
      </svg>
    ),
  },
  {
    label: "Assigned to me",
    to: "/assigned-to-me",
    icon: <FiUserCheck aria-hidden="true" size={18} />,
  },
  {
    label: "Search",
    to: "/search",
    icon: <FiSearch aria-hidden="true" size={18} />,
  },
];

const logoutIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = JSON.parse(localStorage.getItem("user") ?? "null");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

  return (
    <div ref={menuRef} className="relative">
      {open && (
        <div
          className={`absolute bottom-full left-0 mb-2 w-full rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
            collapsed ? "md:w-48" : ""
          }`}
        >
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            leftIcon={logoutIcon}
            onClick={handleLogout}
          >
            Log out
          </Button>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        title={collapsed ? fullName : undefined}
        className={`flex w-full cursor-pointer items-center rounded-lg px-2 py-2 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 ${
          collapsed ? "md:justify-center" : ""
        }`}
      >
        <Avatar name={fullName} />
        <div className={labelClasses(collapsed, "max-w-[220px]")}>
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {fullName}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="flex-shrink-0 text-gray-400 dark:text-gray-500"
            >
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}

function NotificationMenu({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationMeetings, setInvitationMeetings] = useState<Record<string, Meeting>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [respondingId, setRespondingId] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextNotifications, nextInvitations] = await Promise.all([
        listNotifications(),
        listInvitations(),
      ]);
      setNotifications(nextNotifications);
      setInvitations(nextInvitations);
      const pending = nextInvitations
        .filter((invitation) => invitation.invitationStatus === "Invitat")
        .slice(0, 3);
      const meetingPairs = await Promise.all(
        pending.map(async (invitation) => {
          const meeting = await getMeeting(invitation.meetingId).catch(() => null);
          return [invitation.meetingId, meeting] as const;
        }),
      );
      setInvitationMeetings(
        Object.fromEntries(meetingPairs.filter(([, meeting]) => meeting)) as Record<string, Meeting>,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useRealtimeEvent("notifications.changed", () => void loadData());
  useRealtimeEvent("invitations.changed", () => void loadData());
  useRealtimeEvent("notification.created", () => void loadData());
  useRealtimeEvent("invitation.updated", () => void loadData());

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const pendingInvitations = invitations.filter(
    (invitation) => invitation.invitationStatus === "Invitat",
  );

  const openMeeting = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await markNotificationRead(notification.id);
      }
      await loadData();
      setOpen(false);
      if (notification.meetingId) {
        navigate(`/meetings/${notification.meetingId}`);
      }
    } catch (error) {
      toast.error(getFriendlyApiError(error, "Couldn't open this notification."));
    }
  };

  const handleRespond = async (invitation: Invitation, status: "Acceptat" | "Respins") => {
    setRespondingId(invitation.id);
    try {
      await respondToInvitation(invitation.id, status);
      await loadData();
      toast.success(status === "Acceptat" ? "Invitation accepted." : "Invitation rejected.");
    } catch (error) {
      toast.error(getFriendlyApiError(error, "Couldn't respond to this invitation."));
    } finally {
      setRespondingId("");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await loadData();
    } catch (error) {
      toast.error(getFriendlyApiError(error, "Couldn't mark notifications as read."));
    }
  };

  const openInvitationMeeting = (meetingId: string) => {
    setOpen(false);
    navigate(`/meetings/${meetingId}`);
  };

  return (
    <div ref={menuRef} className="relative mb-2">
      {open && (
        <div
          className={`absolute bottom-full left-0 z-20 mb-2 max-h-[70vh] w-80 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
            collapsed ? "md:left-0" : ""
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={() => void handleMarkAllRead()}
              className="text-xs font-medium text-brand disabled:text-gray-400"
            >
              Mark all read
            </button>
          </div>

          {pendingInvitations.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              <p className="text-xs font-medium uppercase text-gray-400">Invitations</p>
              {pendingInvitations.slice(0, 3).map((invitation) => {
                const meeting = invitationMeetings[invitation.meetingId];
                return (
                  <div
                    key={invitation.id}
                    className="rounded-lg border border-gray-100 p-2 dark:border-gray-700"
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {meeting?.title ?? "Meeting invitation"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {meeting ? formatDateTime(meeting.startDateTime) : `Meeting ID: ${invitation.meetingId}`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        leftIcon={<FiCheck />}
                        isLoading={respondingId === invitation.id}
                        onClick={() => void handleRespond(invitation, "Acceptat")}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={respondingId === invitation.id}
                        onClick={() => void handleRespond(invitation, "Respins")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={respondingId === invitation.id}
                        onClick={() => openInvitationMeeting(invitation.meetingId)}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {isLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            )}
            {!isLoading && notifications.length === 0 && pendingInvitations.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet.</p>
            )}
            {notifications.slice(0, 8).map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openMeeting(notification)}
                className={`rounded-lg p-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  notification.isRead ? "opacity-70" : "bg-brand/5 dark:bg-brand/10"
                }`}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {notification.title}
                </p>
                <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                  {notification.message}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        title={collapsed ? "Notifications" : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-10 w-full cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 ${
          collapsed ? "md:justify-center md:px-0" : ""
        }`}
      >
        <span className="relative">
          <FiBell aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        <span className={labelClasses(collapsed)}>Notifications</span>
      </button>
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "1",
  );
  const createMeeting = useMeetingsStore((state) => state.createMeeting);
  const fetchMeetings = useMeetingsStore((state) => state.fetchMeetings);
  const { connected: googleConnected, loading: googleStatusLoading } = useGoogleConnectionStatus();

  useRealtimeConnection();
  useRealtimeEvent("meeting.created", () => void fetchMeetings());
  useRealtimeEvent("meeting.updated", () => void fetchMeetings());
  useRealtimeEvent("meeting.deleted", () => void fetchMeetings());
  useRealtimeEvent("ai.processing", () => void fetchMeetings());
  useRealtimeEvent("ai.completed", () => void fetchMeetings());
  useRealtimeEvent("ai.failed", () => void fetchMeetings());

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsSidebarOpen(false), 0);
    return () => window.clearTimeout(timeoutId);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isCollapsed ? "1" : "0");
  }, [isCollapsed]);

  const handleConnectGoogle = () => {
    if (googleConnected) {
      navigate("/settings");
      return;
    }
    const token = getAccessToken();
    if (!isAccessTokenValid(token)) {
      clearAuthSession();
      navigate("/login");
      return;
    }
    window.location.href = `${API_BASE_URL}/auth/google/connect?token=${token}`;
  };

  const handleCreateMeeting = async (values: MeetingFormValues) => {
    const created = await createMeeting({
      title: values.title,
      description: values.description,
      startDateTime: values.startDateTime,
      endDateTime: values.endDateTime,
      status: values.status as Meeting["status"],
      attendeeIds: values.attendeeIds,
      createGoogleCalendarEvent: values.createGoogleCalendarEvent,
    });
    if (!created) return;
    setIsNewMeetingOpen(false);

    if (values.transcriptFile) {
      void uploadTranscriptFile(created.id, values.transcriptFile);
    } else if (values.transcript) {
      void processTranscript({
        meetingId: created.id,
        transcript: values.transcript,
        fileFormat: values.transcriptFileFormat ?? "text",
        language: "ro",
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-6 transition-transform duration-200 dark:border-gray-800 dark:bg-gray-900 md:translate-x-0 md:transition-[width] ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isCollapsed ? "md:w-20 md:px-2" : "md:w-64 md:px-4"
        }`}
      >
        <div
          className={`mb-6 flex items-center justify-between px-2 ${isCollapsed ? "md:justify-center" : ""}`}
        >
          <Link to="/dashboard" className="flex items-center" title={isCollapsed ? "AutoMinutes" : undefined}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white">
              A
            </div>
            <span className={`${labelClasses(isCollapsed)} text-base font-semibold text-gray-900 dark:text-gray-100`}>
              AutoMinutes
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <div className={isCollapsed ? "md:hidden" : ""}>
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close menu"
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
        </div>

        <button
          type="button"
          title={isCollapsed ? "New meeting" : undefined}
          onClick={() => setIsNewMeetingOpen(true)}
          className="mb-2 flex h-10 w-full shrink-0 cursor-pointer items-center justify-center rounded-lg bg-brand px-0 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          <FiPlus className="shrink-0" aria-hidden="true" />
          <span className={labelClasses(isCollapsed)}>New meeting</span>
        </button>

        <button
          type="button"
          title={isCollapsed ? (googleConnected ? "Google connected" : "Connect to Google") : undefined}
          disabled={googleStatusLoading}
          onClick={handleConnectGoogle}
          className="mb-6 flex h-10 w-full shrink-0 cursor-pointer items-center justify-center rounded-lg bg-gray-100 px-0 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {googleStatusLoading ? (
            <Loader size="sm" />
          ) : (
            <span className="relative shrink-0">
              <FcGoogle aria-hidden="true" size={16} />
              <span
                className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-gray-100 dark:border-gray-800 ${
                  googleConnected ? "bg-green-500" : "bg-red-500"
                }`}
                aria-hidden="true"
              />
            </span>
          )}
          <span className={labelClasses(isCollapsed)}>
            {googleConnected ? "Google connected" : "Connect to Google"}
          </span>
        </button>

        <nav className="flex flex-1 flex-col">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isCollapsed ? "md:justify-center md:px-0" : ""
                  } ${
                    isActive
                      ? "bg-brand/10 text-brand"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                  }`}
                >
                  {item.icon}
                  <span className={labelClasses(isCollapsed)}>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div
            className={`relative hidden flex-1 md:block ${isCollapsed ? "md:-mx-2" : "md:-mx-4"}`}
          >
            <button
              type="button"
              onClick={() => setIsCollapsed((v) => !v)}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              {isCollapsed ? <FiChevronRight size={14} aria-hidden="true" /> : <FiChevronLeft size={14} aria-hidden="true" />}
            </button>
          </div>
        </nav>

        <NotificationMenu collapsed={isCollapsed} />
        <UserMenu collapsed={isCollapsed} />
      </aside>

      <main
        className={`flex-1 overflow-y-auto transition-[margin-left] duration-200 ${
          isCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <div className="sticky top-0 z-20 flex items-center border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 md:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FiMenu aria-hidden="true" />
          </button>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>

      <Modal
        isOpen={isNewMeetingOpen}
        onClose={() => setIsNewMeetingOpen(false)}
        title="New meeting"
        size="lg"
      >
        <MeetingForm
          onSubmit={handleCreateMeeting}
          onCancel={() => setIsNewMeetingOpen(false)}
          submitLabel="Create meeting"
          showGoogleCalendarOption
        />
      </Modal>
    </div>
  );
}

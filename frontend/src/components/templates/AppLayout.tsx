import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiPlus } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { Avatar, Button, Loader } from "../atoms";
import { Modal, ThemeToggle } from "../molecules";
import { MeetingForm, type MeetingFormValues } from "../organisms/meeting";
import { useMeetingsStore } from "../../stores/meetingsStore";
import { useGoogleConnectionStatus } from "../../hooks/useGoogleConnectionStatus";
import { processTranscript } from "../../services/ai";
import { API_BASE_URL } from "../../services/api";
import type { Meeting } from "../../types";

export interface AppLayoutProps {
  children: ReactNode;
}

// Shared by every label next to a sidebar icon: no gap-* on the parent (a flex
// gap reserves space between children no matter how small a child shrinks to),
// so the spacing lives on the label's own margin instead - it can then close to
// 0 together with its width/scale, in the same transition, with nothing left over.
const LABEL_TRANSITION =
  "inline-block origin-left overflow-hidden whitespace-nowrap transition-all duration-200";

function labelClasses(collapsed: boolean, maxWidth = "max-w-[140px]") {
  return `${LABEL_TRANSITION} ${
    collapsed ? "ml-0 max-w-0 scale-x-0 opacity-0" : `ml-2 ${maxWidth} scale-x-100 opacity-100`
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
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

  return (
    <div ref={menuRef} className="relative">
      {open && (
        <div
          className={`absolute bottom-full mb-2 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
            collapsed ? "left-0 w-48" : "left-0 w-full"
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
          collapsed ? "justify-center" : ""
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

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "1",
  );
  const createMeeting = useMeetingsStore((state) => state.createMeeting);
  const { connected: googleConnected, loading: googleStatusLoading } = useGoogleConnectionStatus();

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isCollapsed ? "1" : "0");
  }, [isCollapsed]);

  const handleConnectGoogle = () => {
    if (googleConnected) {
      navigate("/settings");
      return;
    }
    const token = localStorage.getItem("accessToken");
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

    if (values.transcript) {
      void processTranscript({
        meetingId: created.id,
        transcript: values.transcript,
        fileFormat: "text",
        language: "ro",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside
        className={`relative flex flex-shrink-0 flex-col border-r border-gray-200 bg-white py-6 transition-[width] duration-200 dark:border-gray-800 dark:bg-gray-900 ${
          isCollapsed ? "w-20 px-2" : "w-64 px-4"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsCollapsed((v) => !v)}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          {isCollapsed ? <FiChevronRight size={14} aria-hidden="true" /> : <FiChevronLeft size={14} aria-hidden="true" />}
        </button>

        <div className={`mb-6 flex items-center px-2 ${isCollapsed ? "flex-col gap-3" : "justify-between"}`}>
          <Link to="/dashboard" className="flex items-center" title={isCollapsed ? "AutoMinutes" : undefined}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white">
              A
            </div>
            <span className={`${labelClasses(isCollapsed)} text-base font-semibold text-gray-900 dark:text-gray-100`}>
              AutoMinutes
            </span>
          </Link>
          <ThemeToggle />
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
            <FcGoogle className="shrink-0" aria-hidden="true" size={16} />
          )}
          <span className={labelClasses(isCollapsed)}>
            {googleConnected ? "Google connected" : "Connect to Google"}
          </span>
        </button>

        <nav className={`flex flex-1 flex-col gap-1 ${isCollapsed ? "mt-6" : ""}`}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
                  isCollapsed ? "justify-center px-0" : "px-3"
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
        </nav>

        <UserMenu collapsed={isCollapsed} />
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
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

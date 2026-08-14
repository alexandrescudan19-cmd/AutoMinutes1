import {
  FiCalendar,
  FiCheckSquare,
  FiHelpCircle,
  FiLink,
  FiSearch,
  FiSettings,
  FiShare2,
  FiUploadCloud,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { Card } from "../../components/atoms";
import { AppLayout } from "../../components/templates";

const quickStartSteps = [
  "Create a meeting from the sidebar.",
  "Add the schedule, attendees, and optional Google Meet link.",
  "Paste or upload the transcript.",
  "Process it with AI and review the generated summary.",
  "Track action items and share the final summary.",
];

const workflows = [
  {
    title: "Meetings",
    icon: <FiCalendar aria-hidden="true" />,
    items: [
      "Use Meetings to search, sort, filter, and open meeting details.",
      "Open a meeting to edit metadata, manage attendees, upload transcripts, and review AI results.",
      "Use the direct meeting URL when you want to send someone to a specific meeting inside the app.",
    ],
  },
  {
    title: "Google Calendar & Meet",
    icon: <FiSettings aria-hidden="true" />,
    items: [
      "Connect Google from the sidebar or Settings before creating Google Meet events.",
      "When Google is connected, the New meeting flow can create a Calendar event and Meet link.",
      "If OAuth fails, check the frontend origin and backend callback URL shown in Settings.",
    ],
  },
  {
    title: "Transcript & AI",
    icon: <FiZap aria-hidden="true" />,
    items: [
      "Paste transcript text or upload a transcript file from the Transcript & AI tab.",
      "AI creates summary, key points, decisions, follow-up notes, and action items.",
      "Use History to restore previous transcript versions when a newer upload is not correct.",
    ],
  },
  {
    title: "Attendees",
    icon: <FiUsers aria-hidden="true" />,
    items: [
      "Add attendees while creating a meeting or later from the Attendees tab.",
      "Future meetings require emails so invitations and calendar updates can reach people.",
      "Roles help distinguish organizer, presenter, participant, and observer.",
    ],
  },
  {
    title: "Action Items",
    icon: <FiCheckSquare aria-hidden="true" />,
    items: [
      "Use Action Items to view tasks extracted by AI or created manually.",
      "Filter by assignee, open the related meeting, and update task status.",
      "Assigned to me shows the work linked to your account.",
    ],
  },
  {
    title: "Search & Sharing",
    icon: <FiShare2 aria-hidden="true" />,
    items: [
      "Use Search to find meetings and action items across the workspace.",
      "Share summary creates a read-only report link for people outside the app.",
      "Export Markdown downloads a portable meeting summary.",
    ],
  },
];

const troubleshooting = [
  {
    problem: "Google login says redirect_uri_mismatch",
    fix: "Add the exact backend callback URL in Google Cloud OAuth credentials.",
  },
  {
    problem: "Google says app is not verified",
    fix: "Add the user as a test user, or complete Google verification for production.",
  },
  {
    problem: "AI processing returns 429",
    fix: "The AI provider hit a quota/rate limit. Wait, change provider, or add a valid API key with quota.",
  },
  {
    problem: "A transcript result looks wrong",
    fix: "Open Transcript & AI, use History, expand the older version, and restore it.",
  },
];

export default function HelpPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <FiHelpCircle aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                User Guide
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                A practical guide for running meetings from calendar setup to AI summaries.
              </p>
            </div>
          </div>
        </div>

        <Card title="Quick start">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickStartSteps.map((step, index) => (
              <li
                key={step}
                className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{step}</p>
              </li>
            ))}
          </ol>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {workflows.map((workflow) => (
            <Card
              key={workflow.title}
              title={
                <div className="flex items-center gap-2">
                  <span className="text-brand">{workflow.icon}</span>
                  <h2 className="font-medium text-gray-900 dark:text-gray-100">
                    {workflow.title}
                  </h2>
                </div>
              }
            >
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {workflow.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <Card title="Useful buttons">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <FiUploadCloud className="text-brand" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Upload transcript
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Adds transcript text to a meeting and prepares it for AI.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <FiZap className="text-brand" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Process with AI
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Generates summary, decisions, key points, and tasks.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <FiLink className="text-brand" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Share summary
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Creates a read-only report link for the meeting.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <FiSearch className="text-brand" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Global search
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Finds meetings and action items from one place.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Troubleshooting">
          <div className="grid gap-3">
            {troubleshooting.map((item) => (
              <div
                key={item.problem}
                className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.problem}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.fix}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

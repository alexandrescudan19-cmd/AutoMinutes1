import { type ReactNode } from "react";

export interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const FEATURES = [
  "Automatic meeting transcripts",
  "AI-generated summaries",
  "Action items tracked for you",
];

export default function AuthLayout({
  children,
  title = "Meetings, minus the busywork.",
  subtitle = "AutoMinutes turns every meeting into clean notes, summaries, and action items — automatically.",
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-2/5 flex-col justify-center overflow-hidden bg-brand px-12 py-16 text-white lg:flex">
        <div className="relative z-10">
          <h1 className="text-3xl font-semibold leading-tight">{title}</h1>
          <p className="mt-4 max-w-sm text-white/75">{subtitle}</p>

          <ul className="mt-10 flex flex-col gap-3">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-sm text-white/90"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-50 px-4 py-12">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-3xl" />

        <div className="relative z-10 flex w-full flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  );
}

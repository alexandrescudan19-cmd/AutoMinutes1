import { type ReactNode } from "react";
import { motion } from "framer-motion";

/*
  System: Ethereal Glass (dark tech / premium consumer)
  Vibe: Linear / Vercel / Raycast-style auth moment - deep OLED black, glowing mesh orbs,
  a single glass card catching the light. No split panel, no print/editorial grid here.
  Color: near-black canvas, brand-purple + brand-blue glow, white text on frosted glass.
*/

export interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 py-8">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[clamp(420px,42vw,900px)] w-[clamp(420px,42vw,900px)] rounded-full bg-[#7c3aed]/30 blur-[clamp(100px,9vw,190px)]"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-32 h-[clamp(460px,46vw,960px)] w-[clamp(460px,46vw,960px)] rounded-full bg-[#0095f6]/25 blur-[clamp(110px,10vw,200px)]"
        animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.025] blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-center">{children}</div>
    </div>
  );
}

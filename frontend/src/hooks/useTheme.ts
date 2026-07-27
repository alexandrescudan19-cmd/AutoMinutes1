import { useEffect, useState } from "react";
import { updateThemePreference } from "../services/users";

export type Theme = "light" | "dark";
export type ThemeTransitionOrigin = { x: number; y: number };

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Exported so a fresh login/OAuth callback can apply the account's saved
// preference immediately, before the rest of the app (and its own useTheme()) mounts.
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

// Best-effort: syncs the choice back to the account so it's restored on next
// login (elsewhere/another device) - never blocks or surfaces errors for this.
function persistThemeIfLoggedIn(theme: Theme) {
  if (!localStorage.getItem("accessToken")) return;
  updateThemePreference(theme).catch(() => {});
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // origin: the toggle button's position - both directions grow/shrink from there,
  // just in opposite senses (dark reveals outward from it, light collapses back into it).
  const toggleTheme = (origin?: ThemeTransitionOrigin) => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const goingDark = next === "dark";
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!origin || !document.startViewTransition || prefersReducedMotion) {
      setTheme(next);
      persistThemeIfLoggedIn(next);
      return;
    }

    const fullRadius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y),
    );

    // Going to light: the dark screenshot needs to sit ON TOP so it can visibly
    // shrink away and reveal the light one underneath (the opposite of the
    // normal stacking, where the new state reveals over the old one).
    const root = document.documentElement;
    root.classList.toggle("theme-transition-reverse", !goingDark);

    const transition = document.startViewTransition(() => {
      // Apply the DOM change synchronously (not just React state) so the
      // transition's "after" snapshot is captured with the new theme already on.
      applyTheme(next);
      setTheme(next);
      persistThemeIfLoggedIn(next);
    });

    void transition.ready.then(() => {
      const pseudoElement = goingDark ? "::view-transition-new(root)" : "::view-transition-old(root)";
      const clipPath = goingDark
        ? [
            `circle(0px at ${origin.x}px ${origin.y}px)`,
            `circle(${fullRadius}px at ${origin.x}px ${origin.y}px)`,
          ]
        : [
            `circle(${fullRadius}px at ${origin.x}px ${origin.y}px)`,
            `circle(0px at ${origin.x}px ${origin.y}px)`,
          ];

      const animation = document.documentElement.animate(
        { clipPath },
        { duration: 550, easing: "ease-in-out", pseudoElement },
      );
      animation.finished
        .catch(() => {})
        .finally(() => root.classList.remove("theme-transition-reverse"));
    });
  };

  return { theme, toggleTheme };
}

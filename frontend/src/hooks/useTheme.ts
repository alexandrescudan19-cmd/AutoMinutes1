import { useEffect, useState } from "react";
import { updateThemePreference } from "../services/users";

export type Theme = "light" | "dark";
export type ThemeTransitionOrigin = { x: number; y: number };

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

function persistThemeIfLoggedIn(theme: Theme) {
  if (!localStorage.getItem("accessToken")) return;
  updateThemePreference(theme).catch(() => {});
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

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

    const root = document.documentElement;
    root.classList.toggle("theme-transition-reverse", !goingDark);

    const transition = document.startViewTransition(() => {
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

import { useEffect, useRef, useState } from "react";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "resume-react-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  let storedTheme: string | null = null;
  try {
    storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The current theme remains usable even when persistence is blocked.
    }
  }, [theme]);

  useEffect(
    () => () => {
      if (transitionTimeoutRef.current !== null) {
        clearTimeout(transitionTimeoutRef.current);
      }
      document.documentElement.classList.remove("theme-transitioning");
    },
    [],
  );

  const toggleTheme = () => {
    if (transitionTimeoutRef.current !== null) {
      clearTimeout(transitionTimeoutRef.current);
    }
    document.documentElement.classList.add("theme-transitioning");
    transitionTimeoutRef.current = setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
      transitionTimeoutRef.current = null;
    }, 250);
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return { theme, setTheme, toggleTheme };
}

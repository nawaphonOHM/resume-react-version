import { useCallback, useLayoutEffect, useRef, useState } from "react";
import RingTheme, {
  applyTheme as applyRingTheme,
} from "@jetbrains/ring-ui-built/components/global/theme";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "resume-profile-theme";
const THEME_CLASSES = ["resume-theme-light", "resume-theme-dark"] as const;
const THEME_TRANSITION_CLASS = "resume-theme-transitioning";
const THEME_TRANSITION_DURATION_MS = 250;
const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

interface ThemeTransition {
  start(): void;
  cancel(): void;
}

interface ThemeSession {
  theme: Theme;
  explicit: boolean;
  printing: boolean;
  readonly transition: ThemeTransition;
  readonly onChange: (theme: Theme) => void;
}

interface ThemeController {
  setTheme(theme: Theme): void;
  toggle(): void;
  destroy(): void;
}

function readStoredTheme(): Theme | null {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : null;
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
    return null;
  }
}

function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme still applies when persistence is blocked.
  }
}

function getDarkSchemeQuery(): MediaQueryList | null {
  return typeof window.matchMedia === "function"
    ? window.matchMedia(DARK_SCHEME_QUERY)
    : null;
}

function readSystemTheme(): Theme {
  return getDarkSchemeQuery()?.matches ? "dark" : "light";
}

function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? readSystemTheme();
}

function applyDocumentTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove(...THEME_CLASSES);
  root.classList.add(`resume-theme-${theme}`);
  applyRingTheme(theme === "dark" ? RingTheme.DARK : RingTheme.LIGHT, root);
}

function createThemeTransition(): ThemeTransition {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    start: () => {
      clearTimer();
      document.documentElement.classList.add(THEME_TRANSITION_CLASS);
      timer = setTimeout(() => {
        timer = null;
        document.documentElement.classList.remove(THEME_TRANSITION_CLASS);
      }, THEME_TRANSITION_DURATION_MS);
    },
    cancel: () => {
      clearTimer();
      document.documentElement.classList.remove(THEME_TRANSITION_CLASS);
    },
  };
}

function createThemeSession(onChange: (theme: Theme) => void): ThemeSession {
  const storedTheme = readStoredTheme();

  return {
    theme: storedTheme ?? readSystemTheme(),
    explicit: storedTheme !== null,
    printing: false,
    transition: createThemeTransition(),
    onChange,
  };
}

function selectTheme(session: ThemeSession, theme: Theme): void {
  session.theme = theme;
  session.onChange(theme);
}

function chooseTheme(session: ThemeSession, theme: Theme): void {
  if (theme !== session.theme) {
    session.transition.start();
  }

  session.explicit = true;
  selectTheme(session, theme);
  applyDocumentTheme(theme);
  persistTheme(theme);
}

function followSystemTheme(session: ThemeSession, matches: boolean): void {
  if (session.explicit) {
    return;
  }

  selectTheme(session, matches ? "dark" : "light");

  if (!session.printing) {
    applyDocumentTheme(session.theme);
  }
}

function beginPrint(session: ThemeSession): void {
  session.printing = true;
  session.transition.cancel();
  applyDocumentTheme("light");
}

function endPrint(session: ThemeSession): void {
  session.printing = false;
  applyDocumentTheme(session.theme);
}

function createThemeController(
  onChange: (theme: Theme) => void,
): ThemeController {
  const session = createThemeSession(onChange);
  const darkSchemeQuery = getDarkSchemeQuery();
  const handleSystemChange = (event: MediaQueryListEvent) => {
    followSystemTheme(session, event.matches);
  };
  const handleBeforePrint = () => {
    beginPrint(session);
  };
  const handleAfterPrint = () => {
    endPrint(session);
  };

  applyDocumentTheme(session.theme);
  darkSchemeQuery?.addEventListener("change", handleSystemChange);
  window.addEventListener("beforeprint", handleBeforePrint);
  window.addEventListener("afterprint", handleAfterPrint);

  return {
    setTheme: (theme) => {
      chooseTheme(session, theme);
    },
    toggle: () => {
      chooseTheme(session, session.theme === "dark" ? "light" : "dark");
    },
    destroy: () => {
      darkSchemeQuery?.removeEventListener("change", handleSystemChange);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      session.transition.cancel();
    },
  };
}

export function useTheme() {
  const [selectedTheme, setSelectedTheme] =
    useState<Theme>(resolveInitialTheme);
  const controllerRef = useRef<ThemeController | null>(null);

  useLayoutEffect(() => {
    const controller = createThemeController(setSelectedTheme);
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    controllerRef.current?.setTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    controllerRef.current?.toggle();
  }, []);

  return { theme: selectedTheme, setTheme, toggleTheme };
}

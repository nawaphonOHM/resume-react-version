import {
  DARK_SCHEME_QUERY,
  mediaQueryListenerCount,
  resetMatchMedia,
  setMediaQueryMatches,
} from "../test-fixtures/match-media";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./use-theme";

const STORAGE_KEY = "resume-profile-theme";
const TRANSITION_CLASS = "resume-theme-transitioning";

interface ThemeHookResult {
  current: ReturnType<typeof useTheme>;
}

function rootClasses(): DOMTokenList {
  return document.documentElement.classList;
}

function resetDocumentTheme() {
  window.localStorage.clear();
  document.documentElement.className = "";
  resetMatchMedia();
}

function toggleTheme(result: ThemeHookResult) {
  act(() => {
    result.current.toggleTheme();
  });
}

function setSystemDark(matches: boolean) {
  act(() => {
    setMediaQueryMatches(DARK_SCHEME_QUERY, matches);
  });
}

function dispatchWindowEvent(type: "beforeprint" | "afterprint") {
  act(() => {
    window.dispatchEvent(new Event(type));
  });
}

function expectAppliedTheme(theme: "light" | "dark") {
  const other = theme === "light" ? "dark" : "light";
  expect(rootClasses().contains(`resume-theme-${theme}`)).toBe(true);
  expect(rootClasses().contains(`resume-theme-${other}`)).toBe(false);
  expect(rootClasses().contains("ring-ui-theme-dark")).toBe(theme === "dark");
}

function advanceTimers(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

function restoreEnvironment() {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetDocumentTheme();
}

describe("useTheme initial theme", () => {
  beforeEach(resetDocumentTheme);
  afterEach(restoreEnvironment);

  it("restores the stored theme and applies it to the document", () => {
    window.localStorage.setItem(STORAGE_KEY, "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expectAppliedTheme("dark");
  });

  it("ignores an invalid stored value and the retired storage key", () => {
    window.localStorage.setItem(STORAGE_KEY, "sepia");
    window.localStorage.setItem("resume-react-theme", "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expectAppliedTheme("light");
  });

  it("starts from the system preference when nothing is stored", () => {
    setMediaQueryMatches(DARK_SCHEME_QUERY, true);

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expectAppliedTheme("dark");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("falls back to light when matchMedia is unavailable", () => {
    Reflect.deleteProperty(window, "matchMedia");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expectAppliedTheme("light");
  });

  it("continues to apply and toggle the theme when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");

    toggleTheme(result);
    expect(result.current.theme).toBe("dark");
    expectAppliedTheme("dark");
  });
});

describe("useTheme preference tracking", () => {
  beforeEach(resetDocumentTheme);
  afterEach(restoreEnvironment);

  it("follows live system changes without storing anything", () => {
    const { result } = renderHook(() => useTheme());

    setSystemDark(true);
    expect(result.current.theme).toBe("dark");
    expectAppliedTheme("dark");

    setSystemDark(false);
    expect(result.current.theme).toBe("light");
    expectAppliedTheme("light");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("stores an explicit choice and stops following the system", () => {
    const { result } = renderHook(() => useTheme());

    toggleTheme(result);
    expect(result.current.theme).toBe("dark");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("dark");

    setSystemDark(true);
    setSystemDark(false);
    expect(result.current.theme).toBe("dark");
    expectAppliedTheme("dark");
  });

  it("does not follow the system when a choice was stored earlier", () => {
    window.localStorage.setItem(STORAGE_KEY, "light");
    const { result } = renderHook(() => useTheme());

    setSystemDark(true);

    expect(result.current.theme).toBe("light");
    expectAppliedTheme("light");
  });

  it("persists a repeated explicit assignment without a transition", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("light");
    });

    expect(result.current.theme).toBe("light");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(rootClasses().contains(TRANSITION_CLASS)).toBe(false);
  });
});

describe("useTheme printing and transitions", () => {
  beforeEach(resetDocumentTheme);
  afterEach(restoreEnvironment);

  it("forces light classes while printing and restores them afterwards", () => {
    window.localStorage.setItem(STORAGE_KEY, "dark");
    const { result } = renderHook(() => useTheme());

    dispatchWindowEvent("beforeprint");
    expect(result.current.theme).toBe("dark");
    expectAppliedTheme("light");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("dark");

    dispatchWindowEvent("afterprint");
    expect(result.current.theme).toBe("dark");
    expectAppliedTheme("dark");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });

  it("keeps light classes when the system changes during printing", () => {
    const { result } = renderHook(() => useTheme());

    dispatchWindowEvent("beforeprint");
    setSystemDark(true);
    expect(result.current.theme).toBe("dark");
    expectAppliedTheme("light");

    dispatchWindowEvent("afterprint");
    expectAppliedTheme("dark");
  });

  it("cancels a running transition when printing starts", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTheme());

    toggleTheme(result);
    expect(rootClasses().contains(TRANSITION_CLASS)).toBe(true);

    dispatchWindowEvent("beforeprint");
    expect(rootClasses().contains(TRANSITION_CLASS)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("marks the document as transitioning for 250 ms after a toggle", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTheme());

    toggleTheme(result);
    advanceTimers(249);
    expect(rootClasses().contains(TRANSITION_CLASS)).toBe(true);

    advanceTimers(1);
    expect(rootClasses().contains(TRANSITION_CLASS)).toBe(false);
  });

  it("restarts the transition timer on rapid toggles", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTheme());

    toggleTheme(result);
    advanceTimers(200);
    toggleTheme(result);
    advanceTimers(200);
    expect(rootClasses().contains(TRANSITION_CLASS)).toBe(true);
    expect(vi.getTimerCount()).toBe(1);

    advanceTimers(50);
    expect(rootClasses().contains(TRANSITION_CLASS)).toBe(false);
  });

  it("removes listeners, the timer and the marker on unmount", () => {
    vi.useFakeTimers();
    const listenersBefore = mediaQueryListenerCount(DARK_SCHEME_QUERY);
    const { result, unmount } = renderHook(() => useTheme());
    expect(mediaQueryListenerCount(DARK_SCHEME_QUERY)).toBe(
      listenersBefore + 1,
    );

    toggleTheme(result);
    unmount();

    expect(rootClasses().contains(TRANSITION_CLASS)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(mediaQueryListenerCount(DARK_SCHEME_QUERY)).toBe(listenersBefore);
  });

  it("stops reacting to print events after unmount", () => {
    window.localStorage.setItem(STORAGE_KEY, "dark");
    const { unmount } = renderHook(() => useTheme());

    unmount();
    window.dispatchEvent(new Event("beforeprint"));

    expectAppliedTheme("dark");
  });
});

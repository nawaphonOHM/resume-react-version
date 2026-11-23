import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./use-theme";

function toggleTheme(result: { current: { toggleTheme: () => void } }) {
  act(() => {
    result.current.toggleTheme();
  });
}

function expectThemeTransition(active: boolean) {
  expect(
    document.documentElement.classList.contains("theme-transitioning"),
  ).toBe(active);
}

function verifyTransitionTimeout(result: {
  current: { toggleTheme: () => void };
}) {
  toggleTheme(result);
  expectThemeTransition(true);
  act(() => {
    vi.advanceTimersByTime(250);
  });
  expectThemeTransition(false);
  toggleTheme(result);
}

function verifyTransitionCleanup(unmount: () => void) {
  unmount();
  expectThemeTransition(false);
  expect(vi.getTimerCount()).toBe(0);
}

describe("useTheme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("restores the saved theme and applies it to the document", () => {
    window.localStorage.setItem("resume-react-theme", "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("persists theme changes", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(window.localStorage.getItem("resume-react-theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("continues to apply and toggle the theme when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });

    const { result } = renderHook(() => useTheme());
    const initial = result.current.theme;
    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).not.toBe(initial);
    expect(document.documentElement.dataset.theme).toBe(result.current.theme);
  });

  it("clears the theme transition on timeout and unmount", () => {
    vi.useFakeTimers();
    try {
      const { result, unmount } = renderHook(() => useTheme());
      verifyTransitionTimeout(result);
      verifyTransitionCleanup(unmount);
    } finally {
      vi.useRealTimers();
    }
  });
});

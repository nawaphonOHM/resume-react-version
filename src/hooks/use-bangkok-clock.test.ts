import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBangkokClock } from "./use-bangkok-clock";

function faviconHref(): string | undefined {
  return document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href;
}

function faviconFor(status: string): string {
  return `https://ohm-mho.space/assets/favicon.svg?${encodeURIComponent(
    JSON.stringify({ status }),
  )}`;
}

function tick(seconds = 1) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
}

describe("useBangkokClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document.head.querySelector('link[rel="icon"]')?.remove();
  });

  it("formats Bangkok time with UTC+7 date and second precision", () => {
    vi.setSystemTime(new Date("2026-11-15T17:20:30.000Z"));

    const { result } = renderHook(() => useBangkokClock());

    expect(result.current.bangkokTime).toBe("2026-11-16 00:20:30");

    tick();

    expect(result.current.bangkokTime).toBe("2026-11-16 00:20:31");
  });

  it("alternates the tick flag on every clock update", () => {
    vi.setSystemTime(new Date("2026-11-15T17:20:30.000Z"));
    const { result } = renderHook(() => useBangkokClock());
    expect(result.current.isTickAlternate).toBe(false);

    tick();
    expect(result.current.isTickAlternate).toBe(true);

    tick();
    expect(result.current.isTickAlternate).toBe(false);
  });

  it("derives availability from the same instant as the clock text", () => {
    // Monday 2026-05-04 11:59:59 in UTC+7, one second before the lunch break.
    vi.setSystemTime(new Date("2026-05-04T04:59:59.000Z"));
    const { result } = renderHook(() => useBangkokClock());
    expect(result.current.bangkokTime).toBe("2026-05-04 11:59:59");
    expect(result.current.availabilityStatus).toBe("available");

    tick();

    expect(result.current.bangkokTime).toBe("2026-05-04 12:00:00");
    expect(result.current.availabilityStatus).toBe("limited");
  });

  it("keeps the favicon in step with the availability status", () => {
    vi.setSystemTime(new Date("2026-05-04T04:59:59.000Z"));
    renderHook(() => useBangkokClock());
    expect(faviconHref()).toBe(faviconFor("available"));

    tick();

    expect(faviconHref()).toBe(faviconFor("limited"));
  });

  it("stops the clock timer on unmount", () => {
    const { unmount } = renderHook(() => useBangkokClock());
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

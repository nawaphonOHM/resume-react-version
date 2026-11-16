import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBangkokClock } from "./use-bangkok-clock";

describe("useBangkokClock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats Bangkok time with UTC+7 date and second precision", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T17:20:30.000Z"));

    const { result } = renderHook(() => useBangkokClock());

    expect(result.current.bangkokTime).toBe("2026-11-16 00:20:30");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.bangkokTime).toBe("2026-11-16 00:20:31");
  });
});

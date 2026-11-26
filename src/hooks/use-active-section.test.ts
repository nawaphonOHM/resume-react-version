import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResumeSectionId } from "../resume-data";
import { useActiveSection } from "./use-active-section";

const VIEWPORT_HEIGHT = 1000;
const THROTTLE_MS = 100;

type SectionRanges = Partial<Record<ResumeSectionId, [number, number]>>;

function removeSections() {
  for (const section of document.querySelectorAll("section")) {
    section.remove();
  }
}

function placeSections(ranges: SectionRanges) {
  removeSections();

  for (const [id, range] of Object.entries(ranges)) {
    const [top, bottom] = range;
    const section = document.createElement("section");
    section.id = id;
    vi.spyOn(section, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, top, 800, bottom - top),
    );
    document.body.append(section);
  }
}

function dispatchViewportEvent(type: "scroll" | "resize") {
  act(() => {
    window.dispatchEvent(new Event(type));
  });
}

function advance(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

function scrollTo(ranges: SectionRanges) {
  placeSections(ranges);
  dispatchViewportEvent("scroll");
  advance(THROTTLE_MS);
}

function changeHash(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new Event("hashchange"));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("innerHeight", VIEWPORT_HEIGHT);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  removeSections();
  window.history.replaceState(null, "", "/");
});

describe("useActiveSection fragments", () => {
  it("starts on the about section", () => {
    const { result } = renderHook(() => useActiveSection());

    expect(result.current.activeSection).toBe("about");
  });

  it("initializes from the current section fragment", () => {
    window.history.replaceState(null, "", "/#skills");

    const { result } = renderHook(() => useActiveSection());

    expect(result.current.activeSection).toBe("skills");
  });

  it("follows fragment changes that name a section", () => {
    const { result } = renderHook(() => useActiveSection());

    changeHash("#experience");
    expect(result.current.activeSection).toBe("experience");

    changeHash("#main-content");
    expect(result.current.activeSection).toBe("experience");
  });
});

describe("useActiveSection scanline", () => {
  it("selects the section crossing the line at 18 % of the viewport", () => {
    const { result } = renderHook(() => useActiveSection());

    scrollTo({ about: [-700, 179], experience: [179, 2400] });
    expect(result.current.activeSection).toBe("experience");

    scrollTo({ about: [-700, 181], experience: [181, 2400] });
    expect(result.current.activeSection).toBe("about");
  });

  it("falls back to the nearest visible section above or below the line", () => {
    const { result } = renderHook(() => useActiveSection());

    scrollTo({ education: [-400, 120], skills: [260, 700] });
    expect(result.current.activeSection).toBe("skills");

    scrollTo({ education: [150, 170], skills: [500, 900] });
    expect(result.current.activeSection).toBe("education");
  });

  it("ignores sections outside the viewport and keeps the last selection", () => {
    const { result } = renderHook(() => useActiveSection());

    scrollTo({ profile: [400, 900] });
    expect(result.current.activeSection).toBe("profile");

    scrollTo({ about: [-900, 0], experience: [VIEWPORT_HEIGHT, 3000] });
    expect(result.current.activeSection).toBe("profile");
  });

  it("picks up sections that replace their placeholders", () => {
    const { result } = renderHook(() => useActiveSection());

    scrollTo({ about: [100, 300] });
    expect(result.current.activeSection).toBe("about");

    scrollTo({ about: [-600, 100], experience: [100, 2600] });
    expect(result.current.activeSection).toBe("experience");
  });
});

describe("useActiveSection viewport events", () => {
  it("throttles scroll and resize updates to one per 100 ms", () => {
    const { result } = renderHook(() => useActiveSection());
    placeSections({ experience: [0, 900] });

    dispatchViewportEvent("scroll");
    dispatchViewportEvent("resize");
    dispatchViewportEvent("scroll");
    expect(vi.getTimerCount()).toBe(1);

    advance(THROTTLE_MS - 1);
    expect(result.current.activeSection).toBe("about");

    advance(1);
    expect(result.current.activeSection).toBe("experience");
  });

  it("updates on resize", () => {
    const { result } = renderHook(() => useActiveSection());
    placeSections({ skills: [0, 900] });

    dispatchViewportEvent("resize");
    advance(THROTTLE_MS);

    expect(result.current.activeSection).toBe("skills");
  });

  it("removes its listeners and pending timer on unmount", () => {
    const { result, unmount } = renderHook(() => useActiveSection());
    placeSections({ profile: [0, 900] });
    dispatchViewportEvent("scroll");

    unmount();
    expect(vi.getTimerCount()).toBe(0);

    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    expect(vi.getTimerCount()).toBe(0);
    expect(result.current.activeSection).toBe("about");
  });
});

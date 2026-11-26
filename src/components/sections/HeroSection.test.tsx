import {
  resetMatchMedia,
  setMediaQueryMatches,
} from "../../test-fixtures/match-media";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResumeProfile } from "../../resume-data";
import { calculateHeroCodePosition } from "../../status";
import { resumeProfile } from "../../test-fixtures/resume-profile";
import { HeroSection } from "./HeroSection";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const HERO_INTRODUCTION =
  "Building reliable APIs, data integrations, event-driven workflows, and responsive interfaces for financial and business systems.";
// Monday 2026-11-16 00:20:30 in UTC+7: outside business hours, day of month 16.
const NIGHT = new Date("2026-11-15T17:20:30.000Z");
// Monday 2026-05-04 11:59:59 in UTC+7, one second before the lunch break.
const BEFORE_LUNCH = new Date("2026-05-04T04:59:59.000Z");

function renderHero(profile: ResumeProfile = resumeProfile) {
  const view = render(<HeroSection profile={profile} />);
  const section = view.container.querySelector<HTMLElement>("section");
  if (!section) throw new Error("Hero section was not rendered");
  return { ...view, section };
}

function tick(seconds = 1) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
}

function getClock(container: HTMLElement): HTMLElement {
  const clock = container.querySelector("time");
  if (!clock) throw new Error("Hero clock was not rendered");
  return clock;
}

function percent(section: HTMLElement, property: string): number {
  const value = section.style.getPropertyValue(property);
  expect(value.endsWith("%")).toBe(true);
  return Number.parseFloat(value);
}

function expectOrbit(section: HTMLElement, unixSeconds: number) {
  const omega = (2 * Math.PI * 16) / 3600;
  const expected = calculateHeroCodePosition(unixSeconds, { omega });
  expect(percent(section, "--hero-code-left-x")).toBeCloseTo(expected.left.x);
  expect(percent(section, "--hero-code-left-y")).toBeCloseTo(expected.left.y);
  expect(percent(section, "--hero-code-right-x")).toBeCloseTo(expected.right.x);
  expect(percent(section, "--hero-code-right-y")).toBeCloseTo(expected.right.y);
}

function captureAnimationFrames() {
  const callbacks: FrameRequestCallback[] = [];
  vi.spyOn(performance, "now").mockReturnValue(5000);
  const request = vi
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((callback) => callbacks.push(callback));
  const cancel = vi
    .spyOn(window, "cancelAnimationFrame")
    .mockImplementation(() => {});
  return { callbacks, request, cancel };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NIGHT);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetMatchMedia();
  document.head.querySelector('link[rel="icon"]')?.remove();
});

describe("HeroSection content", () => {
  it("introduces the profile with the fixed reference introduction", () => {
    const { section } = renderHero();

    expect(
      screen.getByRole("heading", { level: 1, name: resumeProfile.name }).id,
    ).toBe("hero-title");
    expect(section.querySelector(".hero-role")?.textContent).toBe(
      resumeProfile.title,
    );
    expect(section.querySelector(".hero-introduction")?.textContent).toBe(
      HERO_INTRODUCTION,
    );
    expect(section.textContent).not.toContain(resumeProfile.summary[0]);
  });

  it("is labelled by its title and is not a navigation anchor", () => {
    const { section } = renderHero();

    expect(section.getAttribute("aria-labelledby")).toBe("hero-title");
    expect(section.hasAttribute("id")).toBe(false);
    expect(section.hasAttribute("data-resume-section")).toBe(false);
  });

  it("shows the title and location beside a decorative status dot", () => {
    const { section } = renderHero();
    const [kicker] = section.querySelectorAll(".hero-kicker");
    const statusDot = kicker.querySelector(".status-dot");

    expect(kicker.textContent).toBe(
      `${resumeProfile.title} · ${resumeProfile.details.location}`,
    );
    expect(statusDot?.getAttribute("aria-hidden")).toBe("true");
    expect(statusDot?.hasAttribute("role")).toBe(false);
    expect(statusDot?.hasAttribute("aria-label")).toBe(false);
  });

  it("offers exactly the two reference actions with icons", () => {
    const { section } = renderHero();
    const contact = screen.getByRole("link", { name: "Get in touch" });
    const experience = screen.getByRole("link", { name: "View experience" });

    expect(section.querySelectorAll("a")).toHaveLength(2);
    expect(contact.getAttribute("href")).toBe(
      `mailto:${resumeProfile.details.email}`,
    );
    expect(experience.getAttribute("href")).toBe("#experience");
    expect(contact.querySelector("svg")).not.toBeNull();
    expect(experience.querySelector("svg")).not.toBeNull();
  });

  it("drops the React-only GitHub action and PDF note", () => {
    const { section } = renderHero();

    expect(section.textContent).not.toContain("View GitHub");
    expect(section.textContent).not.toContain("PDF");
    expect(section.querySelector("button")).toBeNull();
  });

  it("renders the fixed monogram and code badges as decoration", () => {
    const { section } = renderHero({
      ...resumeProfile,
      name: "Jane Developer",
    });
    const visual = section.querySelector(".hero-visual");
    if (!visual) throw new Error("Hero visual was not rendered");
    const textOf = (selector: string) =>
      visual.querySelector(selector)?.textContent;

    expect(visual.getAttribute("aria-hidden")).toBe("true");
    expect(textOf(".hero-monogram")).toBe("NI");
    expect(textOf(".hero-code-left")).toBe("</>");
    expect(textOf(".hero-code-right")).toBe("{ }");
    expect(visual.querySelectorAll(".hero-orbit")).toHaveLength(2);
  });
});

describe("HeroSection clock and status", () => {
  it("shows the current UTC+7 time and advances every second", () => {
    const { section } = renderHero();
    const [, clockKicker] = section.querySelectorAll(".hero-kicker");

    expect(clockKicker.textContent).toBe("UTC+7 · 2026-11-16 00:20:30");

    tick();

    expect(getClock(section).textContent).toBe("2026-11-16 00:20:31");
  });

  it.each([
    [0, "slide-fade"],
    [0.5, "opacity-pulse"],
    [0.999, "soft-glow"],
  ] as const)(
    "keeps the transition picked at mount (%s → %s)",
    (random, transition) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      const { section } = renderHero();
      vi.spyOn(Math, "random").mockReturnValue(0.75);

      tick(3);

      expect(getClock(section).className).toBe(
        `hero-clock hero-clock--${transition} hero-clock-tick-a`,
      );
    },
  );

  it("alternates the tick class so every second replays the transition", () => {
    const { section } = renderHero();
    const clock = getClock(section);
    expect(clock.classList.contains("hero-clock-tick-b")).toBe(true);

    tick();
    expect(clock.classList.contains("hero-clock-tick-a")).toBe(true);
    expect(clock.classList.contains("hero-clock-tick-b")).toBe(false);

    tick();
    expect(clock.classList.contains("hero-clock-tick-b")).toBe(true);
    expect(getClock(section)).toBe(clock);
  });

  it("colours the status dot for the instant shown by the clock", () => {
    vi.setSystemTime(BEFORE_LUNCH);
    const { section } = renderHero();
    expect(section.style.getPropertyValue("--status-dot-color")).toBe(
      "#92C353",
    );

    tick();

    expect(section.style.getPropertyValue("--status-dot-color")).toBe(
      "#F7A600",
    );
  });

  it("uses the unavailable colour and favicon at night", () => {
    const { section } = renderHero();
    const favicon =
      document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');

    expect(section.style.getPropertyValue("--status-dot-color")).toBe(
      "#D1D1D1",
    );
    expect(favicon?.href).toBe(
      `https://ohm-mho.space/assets/favicon.svg?${encodeURIComponent(
        JSON.stringify({ status: "unavailable" }),
      )}`,
    );
  });
});

describe("HeroSection motion", () => {
  it("seeds the badge orbit with Unix seconds and the UTC+7 day of month", () => {
    const { section } = renderHero();

    expectOrbit(section, NIGHT.getTime() / 1000);
    expect(section.style.getPropertyValue("--status-dot-luminance")).toBe("1");
  });

  it("advances the orbit and the status pulse on each animation frame", () => {
    const { callbacks, request } = captureAnimationFrames();
    const { section } = renderHero();
    expect(request).toHaveBeenCalledOnce();

    act(() => {
      callbacks[0](6000);
    });

    expectOrbit(section, NIGHT.getTime() / 1000 + 1);
    expect(
      Number(section.style.getPropertyValue("--status-dot-luminance")),
    ).toBeCloseTo(0);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("keeps the animated values when the clock re-renders the hero", () => {
    const { callbacks } = captureAnimationFrames();
    const { section } = renderHero();
    act(() => {
      callbacks[0](6000);
    });

    tick();

    expectOrbit(section, NIGHT.getTime() / 1000 + 1);
  });

  it("does not animate when reduced motion is preferred", () => {
    setMediaQueryMatches(REDUCED_MOTION_QUERY, true);
    const { request } = captureAnimationFrames();

    renderHero();

    expect(request).not.toHaveBeenCalled();
  });

  it("cancels the pending animation frame on unmount", () => {
    const { request, cancel } = captureAnimationFrames();
    const { unmount } = renderHero();
    const frameId: unknown = request.mock.results[0].value;

    unmount();

    expect(cancel).toHaveBeenCalledExactlyOnceWith(frameId);
    expect(vi.getTimerCount()).toBe(0);
  });
});

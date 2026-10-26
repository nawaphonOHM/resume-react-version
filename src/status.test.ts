import { describe, expect, it } from "vitest";
import {
  getAvailabilityBadgeClass,
  getAvailabilityDotClass,
  getAvailabilityLabel,
  getAvailabilityStatus,
  getFaviconUrlForStatus,
  syncFavicon,
  type AvailabilityStatus,
} from "./status";

function withMockDocument(mockDoc: unknown, action: () => void): void {
  const originalDocument = globalThis.document;
  globalThis.document = mockDoc as Document;
  try {
    action();
  } finally {
    globalThis.document = originalDocument;
  }
}

describe("getAvailabilityStatus", () => {
  it("returns unavailable during weekday night hours before 06:00 Bangkok time", () => {
    // Monday 2026-05-04 05:59:59 Bangkok (UTC+7) = 2026-05-03 22:59:59 UTC
    const beforeDawn = new Date("2026-05-03T22:59:59.000Z");
    expect(getAvailabilityStatus(beforeDawn)).toBe("unavailable");
  });

  it("returns limited during weekday early morning hours 06:00-08:59 Bangkok time", () => {
    // Monday 2026-05-04 06:00:00 Bangkok = 2026-05-03 23:00:00 UTC
    const morningStart = new Date("2026-05-03T23:00:00.000Z");
    // Monday 2026-05-04 08:59:59 Bangkok = 2026-05-04 01:59:59 UTC
    const morningEnd = new Date("2026-05-04T01:59:59.000Z");

    expect(getAvailabilityStatus(morningStart)).toBe("limited");
    expect(getAvailabilityStatus(morningEnd)).toBe("limited");
  });

  it("returns available during weekday morning business hours 09:00-11:59 Bangkok time", () => {
    // Monday 2026-05-04 09:00:00 Bangkok = 2026-05-04 02:00:00 UTC
    const workMorningStart = new Date("2026-05-04T02:00:00.000Z");
    // Monday 2026-05-04 11:59:59 Bangkok = 2026-05-04 04:59:59 UTC
    const workMorningEnd = new Date("2026-05-04T04:59:59.000Z");

    expect(getAvailabilityStatus(workMorningStart)).toBe("available");
    expect(getAvailabilityStatus(workMorningEnd)).toBe("available");
  });

  it("returns limited during weekday lunch break 12:00-12:59 Bangkok time", () => {
    // Monday 2026-05-04 12:00:00 Bangkok = 2026-05-04 05:00:00 UTC
    const lunchStart = new Date("2026-05-04T05:00:00.000Z");
    // Monday 2026-05-04 12:59:59 Bangkok = 2026-05-04 05:59:59 UTC
    const lunchEnd = new Date("2026-05-04T05:59:59.000Z");

    expect(getAvailabilityStatus(lunchStart)).toBe("limited");
    expect(getAvailabilityStatus(lunchEnd)).toBe("limited");
  });

  it("returns available during weekday afternoon business hours 13:00-17:59 Bangkok time", () => {
    // Monday 2026-05-04 13:00:00 Bangkok = 2026-05-04 06:00:00 UTC
    const workAfternoonStart = new Date("2026-05-04T06:00:00.000Z");
    // Monday 2026-05-04 17:59:59 Bangkok = 2026-05-04 10:59:59 UTC
    const workAfternoonEnd = new Date("2026-05-04T10:59:59.000Z");

    expect(getAvailabilityStatus(workAfternoonStart)).toBe("available");
    expect(getAvailabilityStatus(workAfternoonEnd)).toBe("available");
  });

  it("returns limited during weekday evening hours 18:00-21:59 Bangkok time", () => {
    // Monday 2026-05-04 18:00:00 Bangkok = 2026-05-04 11:00:00 UTC
    const eveningStart = new Date("2026-05-04T11:00:00.000Z");
    // Monday 2026-05-04 21:59:59 Bangkok = 2026-05-04 14:59:59 UTC
    const eveningEnd = new Date("2026-05-04T14:59:59.000Z");

    expect(getAvailabilityStatus(eveningStart)).toBe("limited");
    expect(getAvailabilityStatus(eveningEnd)).toBe("limited");
  });

  it("returns unavailable during weekday night hours after 22:00 Bangkok time", () => {
    // Monday 2026-05-04 22:00:00 Bangkok = 2026-05-04 15:00:00 UTC
    const nightStart = new Date("2026-05-04T15:00:00.000Z");
    expect(getAvailabilityStatus(nightStart)).toBe("unavailable");
  });

  it("returns limited throughout weekend daytime even during business hours", () => {
    // Saturday 2026-05-09 10:00:00 Bangkok = 2026-05-09 03:00:00 UTC
    const saturdayDaytime = new Date("2026-05-09T03:00:00.000Z");
    // Sunday 2026-05-10 14:00:00 Bangkok = 2026-05-10 07:00:00 UTC
    const sundayDaytime = new Date("2026-05-10T07:00:00.000Z");

    expect(getAvailabilityStatus(saturdayDaytime)).toBe("limited");
    expect(getAvailabilityStatus(sundayDaytime)).toBe("limited");
  });

  it("returns unavailable during weekend night hours", () => {
    // Saturday 2026-05-09 05:00:00 Bangkok = 2026-05-08 22:00:00 UTC
    const weekendEarlyNight = new Date("2026-05-08T22:00:00.000Z");
    // Sunday 2026-05-10 23:00:00 Bangkok = 2026-05-10 16:00:00 UTC
    const weekendLateNight = new Date("2026-05-10T16:00:00.000Z");

    expect(getAvailabilityStatus(weekendEarlyNight)).toBe("unavailable");
    expect(getAvailabilityStatus(weekendLateNight)).toBe("unavailable");
  });
});

describe("presentation and helper mappings", () => {
  it("maps availability statuses to descriptive labels", () => {
    expect(getAvailabilityLabel("available")).toBe(
      "Available in Bangkok business hours",
    );
    expect(getAvailabilityLabel("limited")).toBe(
      "Limited availability in Bangkok",
    );
    expect(getAvailabilityLabel("unavailable")).toBe(
      "Currently offline in Bangkok",
    );
  });

  it("maps availability statuses to badge CSS classes", () => {
    expect(getAvailabilityBadgeClass("available")).toContain(
      "bg-emerald-500/12",
    );
    expect(getAvailabilityBadgeClass("limited")).toContain("bg-amber-500/12");
    expect(getAvailabilityBadgeClass("unavailable")).toContain(
      "bg-slate-500/12",
    );
  });

  it("maps availability statuses to dot CSS classes", () => {
    expect(getAvailabilityDotClass("available")).toContain("bg-emerald-500");
    expect(getAvailabilityDotClass("limited")).toContain("bg-amber-500");
    expect(getAvailabilityDotClass("unavailable")).toContain("bg-slate-400");
  });

  it("maps availability statuses to favicon asset URLs", () => {
    const statuses: AvailabilityStatus[] = [
      "available",
      "limited",
      "unavailable",
    ];
    for (const status of statuses) {
      expect(getFaviconUrlForStatus(status)).toContain(
        `/favicons/${status}/favicon.svg`,
      );
    }
  });

  it("safely handles favicon synchronization in non-browser environments", () => {
    expect(() => {
      syncFavicon("https://example.com/test-favicon.svg");
    }).not.toThrow();
  });

  it("updates existing favicon link element when document is present", () => {
    const mockLink = { href: "", rel: "" } as unknown as HTMLLinkElement;
    const mockDocument = {
      head: {
        querySelector: () => mockLink,
        append: () => {},
      },
      createElement: () => mockLink,
    };

    withMockDocument(mockDocument, () => {
      const testUrl = "https://example.com/test-favicon.svg";
      syncFavicon(testUrl);
      expect(mockLink.href).toBe(testUrl);
    });
  });

  it("creates and appends favicon link element when not already present", () => {
    let appendedElement: HTMLLinkElement | null = null;
    const newLink = { href: "", rel: "" } as unknown as HTMLLinkElement;
    const mockDocument = {
      head: {
        querySelector: () => null,
        append: (element: HTMLLinkElement) => {
          appendedElement = element;
        },
      },
      createElement: () => newLink,
    };

    withMockDocument(mockDocument, () => {
      const testUrl = "https://example.com/new-favicon.svg";
      syncFavicon(testUrl);
      expect(appendedElement).toBe(newLink);
      expect(newLink.rel).toBe("icon");
      expect(newLink.href).toBe(testUrl);
    });
  });
});

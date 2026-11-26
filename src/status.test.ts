// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateHeroCodePosition,
  calculateStatusLuminance,
  gcd,
  getAvailabilityStatus,
  getFaviconUrlForStatus,
  getHeroCodeAngularFrequency,
  getStatusColor,
  HERO_CLOCK_TRANSITIONS,
  pickHeroClockTransition,
  STATUS_COLORS,
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

describe("status presentation mappings", () => {
  it("maps availability statuses to exact status color hex strings", () => {
    expect(STATUS_COLORS.available).toBe("#92C353");
    expect(STATUS_COLORS.limited).toBe("#F7A600");
    expect(STATUS_COLORS.unavailable).toBe("#D1D1D1");
  });

  it("retrieves status colors via getStatusColor", () => {
    expect(getStatusColor("available")).toBe("#92C353");
    expect(getStatusColor("limited")).toBe("#F7A600");
    expect(getStatusColor("unavailable")).toBe("#D1D1D1");
  });
});

describe("hero clock transitions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("offers the three reference transitions", () => {
    expect(HERO_CLOCK_TRANSITIONS).toEqual([
      "slide-fade",
      "opacity-pulse",
      "soft-glow",
    ]);
  });

  it("maps the random source onto the three transitions", () => {
    const random = vi.spyOn(Math, "random");

    random.mockReturnValue(0);
    expect(pickHeroClockTransition()).toBe("slide-fade");
    random.mockReturnValue(0.5);
    expect(pickHeroClockTransition()).toBe("opacity-pulse");
    random.mockReturnValue(0.999);
    expect(pickHeroClockTransition()).toBe("soft-glow");
  });
});

describe("mathematical and asset helpers", () => {
  it("calculates greatest common divisor accurately", () => {
    expect(gcd(37, 50)).toBe(1);
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(0, 10)).toBe(10);
    expect(gcd(10, 0)).toBe(10);
  });

  it("calculates status luminance bounded in [0, 1]", () => {
    // at t=0, cos(0)=1 => L = 0.5 + 0.5 = 1.0
    expect(calculateStatusLuminance(0)).toBeCloseTo(1.0);
    // at t=1, cos(pi)=-1 => L = 0.5 - 0.5 = 0.0
    expect(calculateStatusLuminance(1)).toBeCloseTo(0.0);
    // at t=0.5, cos(pi/2)=0 => L = 0.5
    expect(calculateStatusLuminance(0.5)).toBeCloseTo(0.5);
    // with custom amplitude & phi
    expect(
      calculateStatusLuminance(0, { amplitude: 0.25, phi: 0 }),
    ).toBeCloseTo(0.75);
  });
});

describe("hero code orbit", () => {
  it("calculates 2D orbital coordinates for hero code tokens", () => {
    const pos = calculateHeroCodePosition(0, { omega: 0.15 });
    expect(pos.left.x).toBeCloseTo(37);
    expect(pos.left.y).toBeCloseTo(0);
    expect(pos.right.x).toBeCloseTo(50);
    expect(pos.right.y).toBeCloseTo(0);

    const customPos = calculateHeroCodePosition(0, {
      omega: 0.15,
      rLeft: 40,
      rRight: 60,
    });
    expect(customPos.left.x).toBeCloseTo(40);
    expect(customPos.right.x).toBeCloseTo(60);
  });

  it("advances the right badge by omega and the left badge by the radius ratio", () => {
    const omega = Math.PI / 2;
    const pos = calculateHeroCodePosition(1, { omega });

    expect(pos.right.x).toBeCloseTo(0);
    expect(pos.right.y).toBeCloseTo(50);
    expect(pos.left.x).toBeCloseTo(37 * Math.cos(omega * (50 / 37)));
    expect(pos.left.y).toBeCloseTo(37 * Math.sin(omega * (50 / 37)));
  });

  it("repeats hero code positions after one shared orbital period", () => {
    const omega = 0.2;
    const period = (2 * Math.PI * 37) / omega;
    const start = calculateHeroCodePosition(12.5, { omega });
    const later = calculateHeroCodePosition(12.5 + period, { omega });

    expect(later.left.x).toBeCloseTo(start.left.x);
    expect(later.left.y).toBeCloseTo(start.left.y);
    expect(later.right.x).toBeCloseTo(start.right.x);
    expect(later.right.y).toBeCloseTo(start.right.y);
  });

  it("keeps the badges still when the angular frequency is zero", () => {
    const pos = calculateHeroCodePosition(1_800_000_000, { omega: 0 });

    expect(pos.left).toEqual({ x: 37, y: 0 });
    expect(pos.right).toEqual({ x: 50, y: 0 });
  });

  it("derives the orbit frequency from the UTC+7 day of month per hour", () => {
    // 2026-11-30 17:00:00 UTC is 2026-12-01 00:00:00 in UTC+7.
    const firstOfMonth = new Date("2026-11-30T17:00:00.000Z");
    // One second earlier is still the 30th in UTC+7.
    const thirtieth = new Date("2026-11-30T16:59:59.000Z");

    expect(getHeroCodeAngularFrequency(firstOfMonth)).toBeCloseTo(
      (2 * Math.PI * 1) / 3600,
    );
    expect(getHeroCodeAngularFrequency(thirtieth)).toBeCloseTo(
      (2 * Math.PI * 30) / 3600,
    );
  });
});

describe("favicon helpers", () => {
  it("maps availability statuses to favicon asset URLs", () => {
    const statuses: AvailabilityStatus[] = [
      "available",
      "limited",
      "unavailable",
    ];
    for (const status of statuses) {
      expect(getFaviconUrlForStatus(status)).toBe(
        `https://ohm-mho.space/assets/favicon.svg?${encodeURIComponent(
          JSON.stringify({ status }),
        )}`,
      );
    }
  });

  it("safely handles favicon synchronization in non-browser environments", () => {
    expect(() => {
      syncFavicon("https://example.com/test-favicon.svg");
    }).not.toThrow();
  });

  it("updates existing favicon link element when document is present", () => {
    const mockLink = {
      href: "",
      rel: "",
      type: "",
    } as unknown as HTMLLinkElement;
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
    const newLink = {
      href: "",
      rel: "",
      type: "",
    } as unknown as HTMLLinkElement;
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
      expect(newLink.type).toBe("image/svg+xml");
      expect(newLink.href).toBe(testUrl);
    });
  });
});

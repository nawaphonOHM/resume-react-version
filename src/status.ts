import { assetUrls } from "./data/asset-urls";

export type AvailabilityStatus = "available" | "limited" | "unavailable";

const SECONDS_PER_HOUR = 60 * 60;
const UTC_PLUS_SEVEN_OFFSET_MS = 7 * SECONDS_PER_HOUR * 1000;
const weekdayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const bangkokPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

interface BangkokTime {
  dayOfWeek: number;
  secondsSinceMidnight: number;
}

function getBangkokTime(instant: Date): BangkokTime {
  const parts = Object.fromEntries(
    bangkokPartsFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const dayOfWeek = weekdayMap[parts.weekday] ?? 0;
  const hours = Number(parts.hour);
  const minutes = Number(parts.minute);
  const seconds = Number(parts.second);

  return {
    dayOfWeek,
    secondsSinceMidnight: hours * SECONDS_PER_HOUR + minutes * 60 + seconds,
  };
}

function getWeekdayStatus(secondsSinceMidnight: number): AvailabilityStatus {
  const isMorningWork =
    secondsSinceMidnight >= 9 * SECONDS_PER_HOUR &&
    secondsSinceMidnight < 12 * SECONDS_PER_HOUR;
  const isAfternoonWork =
    secondsSinceMidnight >= 13 * SECONDS_PER_HOUR &&
    secondsSinceMidnight < 18 * SECONDS_PER_HOUR;

  if (isMorningWork || isAfternoonWork) {
    return "available";
  }

  return "limited";
}

export function getAvailabilityStatus(instant: Date): AvailabilityStatus {
  const { dayOfWeek, secondsSinceMidnight } = getBangkokTime(instant);

  if (
    secondsSinceMidnight < 6 * SECONDS_PER_HOUR ||
    secondsSinceMidnight >= 22 * SECONDS_PER_HOUR
  ) {
    return "unavailable";
  }

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return "limited";
  }

  return getWeekdayStatus(secondsSinceMidnight);
}

export const STATUS_COLORS: Record<AvailabilityStatus, string> = {
  available: "#92C353",
  limited: "#F7A600",
  unavailable: "#D1D1D1",
};

export function getStatusColor(status: AvailabilityStatus): string {
  return STATUS_COLORS[status];
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export interface StatusLuminanceOptions {
  amplitude?: number;
  omega?: number;
  phi?: number;
}

const DEFAULT_LUMINANCE_OPTIONS: Required<StatusLuminanceOptions> = {
  amplitude: 0.5,
  omega: Math.PI,
  phi: 0,
};

/**
 * Calculates oscillating relative luminance value L(t) in [0, 1] using simple harmonic oscillator.
 * x(t) = A * cos(omega * t + phi)
 * L(t) = clamp(0.5 + x(t), 0, 1)
 */
export function calculateStatusLuminance(
  elapsedSeconds: number,
  options?: StatusLuminanceOptions,
): number {
  const opts = { ...DEFAULT_LUMINANCE_OPTIONS, ...options };
  const x_t = opts.amplitude * Math.cos(opts.omega * elapsedSeconds + opts.phi);
  return Math.min(1, Math.max(0, 0.5 + x_t));
}

export interface HeroCodePosition2D {
  x: number;
  y: number;
}

export interface HeroCodeOrbitPositions {
  left: HeroCodePosition2D;
  right: HeroCodePosition2D;
}

export interface HeroCodePositionOptions {
  omega: number;
  phiLeft?: number;
  phiRight?: number;
  rLeft?: number;
  rRight?: number;
}

const DEFAULT_HERO_CODE_OPTIONS = {
  phiLeft: 0,
  phiRight: 0,
  rLeft: 37,
  rRight: 50,
};

function getOrbitalPeriod(
  omega: number,
  rLeft: number,
  rRight: number,
): number {
  if (omega <= 0 || rLeft <= 0 || rRight <= 0) {
    return 0;
  }
  const g = gcd(rLeft, rRight);
  return (2 * Math.PI * (rLeft / g)) / omega;
}

/**
 * Angular frequency of the hero code orbit: the UTC+7 day of month, in
 * revolutions per hour, expressed in radians per second.
 */
export function getHeroCodeAngularFrequency(instant: Date): number {
  const dayOfMonth = new Date(
    instant.getTime() + UTC_PLUS_SEVEN_OFFSET_MS,
  ).getUTCDate();
  return (2 * Math.PI * dayOfMonth) / SECONDS_PER_HOUR;
}

/**
 * Calculates continuous 2D circular orbital positions for hero code badges.
 */
export function calculateHeroCodePosition(
  elapsedSeconds: number,
  options: HeroCodePositionOptions,
): HeroCodeOrbitPositions {
  const opts = { ...DEFAULT_HERO_CODE_OPTIONS, ...options };
  const period = getOrbitalPeriod(opts.omega, opts.rLeft, opts.rRight);
  const t = period > 0 ? elapsedSeconds % period : elapsedSeconds;

  const leftAngle = opts.omega * (opts.rRight / opts.rLeft) * t + opts.phiLeft;
  const rightAngle = opts.omega * t + opts.phiRight;

  return {
    left: {
      x: opts.rLeft * Math.cos(leftAngle),
      y: opts.rLeft * Math.sin(leftAngle),
    },
    right: {
      x: opts.rRight * Math.cos(rightAngle),
      y: opts.rRight * Math.sin(rightAngle),
    },
  };
}

export const HERO_CLOCK_TRANSITIONS = [
  "slide-fade",
  "opacity-pulse",
  "soft-glow",
] as const;

export type HeroClockTransition = (typeof HERO_CLOCK_TRANSITIONS)[number];

export function pickHeroClockTransition(): HeroClockTransition {
  return HERO_CLOCK_TRANSITIONS[
    Math.floor(Math.random() * HERO_CLOCK_TRANSITIONS.length)
  ];
}

export function getFaviconUrlForStatus(status: AvailabilityStatus): string {
  return assetUrls.favicon(status);
}

export function syncFavicon(url: string): void {
  if (typeof document === "undefined") {
    return;
  }

  let faviconLink = document.head.querySelector<HTMLLinkElement>(
    'link[rel="icon"], link[rel~="icon"]',
  );

  if (!faviconLink) {
    faviconLink = document.createElement("link");
    faviconLink.rel = "icon";
    faviconLink.type = "image/svg+xml";
    document.head.append(faviconLink);
  }

  faviconLink.href = url;
}

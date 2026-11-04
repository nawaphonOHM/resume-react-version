export type AvailabilityStatus = "available" | "limited" | "unavailable";

const SECONDS_PER_HOUR = 60 * 60;
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

const faviconUrls: Record<AvailabilityStatus, string> = {
  available:
    "https://resume-images.ohm-mho.space/favicons/available/favicon.svg",
  limited: "https://resume-images.ohm-mho.space/favicons/limited/favicon.svg",
  unavailable:
    "https://resume-images.ohm-mho.space/favicons/unavailable/favicon.svg",
};

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

export function getAvailabilityLabel(status: AvailabilityStatus): string {
  switch (status) {
    case "available":
      return "Available in Bangkok business hours";
    case "limited":
      return "Limited availability in Bangkok";
    default:
      return "Currently offline in Bangkok";
  }
}

export function getAvailabilityBadgeClass(status: AvailabilityStatus): string {
  switch (status) {
    case "available":
      return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
    case "limited":
      return "bg-amber-500/12 text-amber-700 dark:text-amber-300";
    default:
      return "bg-slate-500/12 text-slate-700 dark:text-slate-300";
  }
}

export function getAvailabilityDotClass(status: AvailabilityStatus): string {
  switch (status) {
    case "available":
      return "bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.55)]";
    case "limited":
      return "bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.45)]";
    default:
      return "bg-slate-400 shadow-[0_0_14px_rgba(148,163,184,0.35)]";
  }
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
  omega?: number;
  phiLeft?: number;
  phiRight?: number;
  rLeft?: number;
  rRight?: number;
}

const DEFAULT_HERO_CODE_OPTIONS: Required<HeroCodePositionOptions> = {
  omega: 0.15,
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
 * Calculates continuous 2D circular orbital positions for hero code badges.
 */
export function calculateHeroCodePosition(
  elapsedSeconds: number,
  options?: HeroCodePositionOptions,
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

export function getFaviconUrlForStatus(status: AvailabilityStatus): string {
  return faviconUrls[status];
}

export function syncFavicon(url: string): void {
  if (typeof document === "undefined") {
    return;
  }

  let faviconLink =
    document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');

  if (!faviconLink) {
    faviconLink = document.createElement("link");
    faviconLink.rel = "icon";
    document.head.append(faviconLink);
  }

  faviconLink.href = url;
}

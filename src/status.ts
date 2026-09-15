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

export function getAvailabilityStatus(instant: Date): AvailabilityStatus {
  const parts = Object.fromEntries(
    bangkokPartsFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const dayOfWeek = weekdayMap[parts.weekday] ?? 0;
  const hours = Number(parts.hour ?? 0);
  const minutes = Number(parts.minute ?? 0);
  const seconds = Number(parts.second ?? 0);
  const secondsSinceMidnight =
    hours * SECONDS_PER_HOUR + minutes * 60 + seconds;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (secondsSinceMidnight < 6 * SECONDS_PER_HOUR) {
    return "unavailable";
  }

  if (secondsSinceMidnight >= 22 * SECONDS_PER_HOUR) {
    return "unavailable";
  }

  if (isWeekend) {
    return "limited";
  }

  if (secondsSinceMidnight < 9 * SECONDS_PER_HOUR) {
    return "limited";
  }

  if (secondsSinceMidnight < 12 * SECONDS_PER_HOUR) {
    return "available";
  }

  if (secondsSinceMidnight < 13 * SECONDS_PER_HOUR) {
    return "limited";
  }

  if (secondsSinceMidnight < 18 * SECONDS_PER_HOUR) {
    return "available";
  }

  return "limited";
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

export function getFaviconUrlForStatus(status: AvailabilityStatus): string {
  return faviconUrls[status];
}

export function syncFavicon(url: string) {
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

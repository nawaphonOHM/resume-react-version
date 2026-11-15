import { useEffect, useMemo, useState } from "react";
import {
  getAvailabilityLabel,
  getAvailabilityStatus,
  getFaviconUrlForStatus,
  syncFavicon,
} from "../status";

function formatBangkokDate(date: Date): string {
  const parts: Record<string, string> = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Bangkok",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function getBangkokHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Bangkok",
    }).format(date),
  );
}

export function useBangkokClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const bangkokTime = useMemo(
    () => formatBangkokDate(currentTime),
    [currentTime],
  );
  const bangkokHour = useMemo(() => getBangkokHour(currentTime), [currentTime]);
  const availabilityStatus = useMemo(
    () => getAvailabilityStatus(currentTime),
    [currentTime],
  );
  const availabilityLabel = useMemo(
    () => getAvailabilityLabel(availabilityStatus),
    [availabilityStatus],
  );

  useEffect(() => {
    syncFavicon(getFaviconUrlForStatus(availabilityStatus));
  }, [availabilityStatus]);

  return {
    currentTime,
    bangkokTime,
    bangkokHour,
    availabilityStatus,
    availabilityLabel,
  };
}

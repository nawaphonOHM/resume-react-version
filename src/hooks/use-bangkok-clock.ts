import { useEffect, useMemo, useState } from "react";
import {
  getAvailabilityStatus,
  getFaviconUrlForStatus,
  syncFavicon,
} from "../status";

const CLOCK_UPDATE_INTERVAL_MS = 1000;

interface ClockState {
  currentTime: Date;
  tickCount: number;
}

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

export function useBangkokClock() {
  const [clock, setClock] = useState<ClockState>(() => ({
    currentTime: new Date(),
    tickCount: 0,
  }));
  const { currentTime, tickCount } = clock;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock((previous) => ({
        currentTime: new Date(),
        tickCount: previous.tickCount + 1,
      }));
    }, CLOCK_UPDATE_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const bangkokTime = useMemo(
    () => formatBangkokDate(currentTime),
    [currentTime],
  );
  const availabilityStatus = useMemo(
    () => getAvailabilityStatus(currentTime),
    [currentTime],
  );

  useEffect(() => {
    syncFavicon(getFaviconUrlForStatus(availabilityStatus));
  }, [availabilityStatus]);

  return {
    currentTime,
    bangkokTime,
    availabilityStatus,
    isTickAlternate: tickCount % 2 === 1,
  };
}

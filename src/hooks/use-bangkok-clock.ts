import { useEffect, useMemo, useState } from "react";
import {
  getAvailabilityLabel,
  getAvailabilityStatus,
  getFaviconUrlForStatus,
  syncFavicon,
} from "../status";

function formatBangkokDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
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

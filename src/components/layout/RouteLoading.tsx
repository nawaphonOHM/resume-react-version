import { useEffect, useState } from "react";
import LoaderInline from "@jetbrains/ring-ui-built/components/loader-inline/loader-inline";

const ROUTE_LOADING_LEAVE_MS = 300;

export interface RouteLoadingProps {
  loading: boolean;
}

export function RouteLoading({ loading }: RouteLoadingProps) {
  const [wasLoading, setWasLoading] = useState(loading);
  const [leaving, setLeaving] = useState(false);

  if (loading !== wasLoading) {
    setWasLoading(loading);
    setLeaving(!loading);
  }

  useEffect(() => {
    if (!leaving) {
      return;
    }

    const timer = setTimeout(() => {
      setLeaving(false);
    }, ROUTE_LOADING_LEAVE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [leaving]);

  if (!loading && !leaving) {
    return null;
  }

  return (
    <div
      className={
        leaving
          ? "route-loading-container route-loading-leave"
          : "route-loading-container"
      }
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <LoaderInline aria-hidden="true" />
    </div>
  );
}

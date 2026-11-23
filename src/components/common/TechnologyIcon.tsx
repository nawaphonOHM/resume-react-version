import { useEffect, useState } from "react";
import type { TechnologyIconMetadata } from "../../data/technology-icons";
import { enhanceTechnologyIcon } from "../../services/technology-icon-contrast";

export interface TechnologyIconProps {
  icon?: TechnologyIconMetadata | null;
  label: string;
  className?: string;
  onError?: () => void;
}

export function CodeFallbackIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`technology-fallback-icon h-[1.1rem] w-[1.1rem] text-[var(--app-muted)] ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
      />
    </svg>
  );
}

function useEnhancedIcon(icon: TechnologyIconMetadata | null | undefined) {
  const [enhanced, setEnhanced] = useState<{
    key: string;
    src: string;
    surface?: "light" | "dark";
  } | null>(null);
  const src = icon?.src;
  const width = icon?.width;
  const height = icon?.height;
  const key = JSON.stringify([src, width, height]);

  useEffect(() => {
    if (!src || !width || !height) {
      return;
    }
    let active = true;
    void enhanceTechnologyIcon(src, width, height)
      .then((result) => {
        if (active && result !== src) {
          setEnhanced({
            key,
            src: result,
            surface: enhanceTechnologyIcon.surfaceFor(src, width, height),
          });
        }
      })
      .catch(() => {
        // The original image remains usable if enhancement fails.
      });
    return () => {
      active = false;
    };
  }, [src, width, height, key]);

  return { enhanced, key };
}

function chooseIconSource({
  original,
  key,
  enhanced,
  failed,
}: {
  original: string;
  key: string;
  enhanced: { key: string; src: string } | null;
  failed: string | null;
}): string {
  return enhanced?.key === key && failed !== enhanced.src
    ? enhanced.src
    : original;
}

function chooseIconSurface({
  icon,
  displayedSrc,
  key,
  enhanced,
}: {
  icon: TechnologyIconMetadata;
  displayedSrc: string;
  key: string;
  enhanced: { key: string; surface?: "light" | "dark" } | null;
}) {
  return displayedSrc !== icon.src && enhanced?.key === key
    ? (enhanced.surface ?? icon.surface)
    : icon.surface;
}

export function TechnologyIcon({
  icon,
  label,
  className = "",
  onError,
}: TechnologyIconProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [failedEnhancement, setFailedEnhancement] = useState<string | null>(
    null,
  );
  const { enhanced, key } = useEnhancedIcon(icon);
  if (!icon || failedSrc === icon.src) {
    return (
      <span
        className={`technology-icon-container inline-grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-[0.3rem] ${className}`}
        aria-hidden="true"
      >
        <CodeFallbackIcon />
      </span>
    );
  }

  const displayedSrc = chooseIconSource({
    original: icon.src,
    key,
    enhanced,
    failed: failedEnhancement,
  });
  const surface = chooseIconSurface({ icon, displayedSrc, key, enhanced });
  const surfaceClass = surface === "dark" ? "bg-[#071a2e]" : "bg-white";

  return (
    <span
      className={`technology-icon-container technology-icon-frame inline-grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-[0.3rem] border border-[color:var(--app-border)] p-px ${surfaceClass} ${className}`}
      aria-hidden="true"
    >
      <img
        src={displayedSrc}
        alt=""
        width={icon.width}
        height={icon.height}
        loading="lazy"
        className="technology-brand-icon block h-full w-full object-contain"
        onError={() => {
          if (displayedSrc !== icon.src) {
            setFailedEnhancement(displayedSrc);
          } else {
            setFailedSrc(icon.src);
            onError?.();
          }
        }}
        data-label={label}
      />
    </span>
  );
}

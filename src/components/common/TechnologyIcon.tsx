import { useState } from "react";
import type { TechnologyIconMetadata } from "../../data/technology-icons";

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

export function TechnologyIcon({
  icon,
  label,
  className = "",
  onError,
}: TechnologyIconProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isCurrentFailed = icon ? failedSrc === icon.src : false;

  if (!icon || isCurrentFailed) {
    return (
      <span
        className={`technology-icon-container inline-grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-[0.3rem] ${className}`}
        aria-hidden="true"
      >
        <CodeFallbackIcon />
      </span>
    );
  }

  const surfaceClass = icon.surface === "dark" ? "bg-[#071a2e]" : "bg-white";

  return (
    <span
      className={`technology-icon-container technology-icon-frame inline-grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-[0.3rem] border border-[color:var(--app-border)] p-px ${surfaceClass} ${className}`}
      aria-hidden="true"
    >
      <img
        src={icon.src}
        alt=""
        width={icon.width}
        height={icon.height}
        loading="lazy"
        className="technology-brand-icon block h-full w-full object-contain"
        onError={() => {
          setFailedSrc(icon.src);
          onError?.();
        }}
        data-label={label}
      />
    </span>
  );
}

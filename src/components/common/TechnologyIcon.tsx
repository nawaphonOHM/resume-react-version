import { useEffect, useState } from "react";
import Icon from "@jetbrains/ring-ui-built/components/icon/icon";
import LoaderInline from "@jetbrains/ring-ui-built/components/loader-inline/loader-inline";
import type { TechnologyIconMetadata } from "../../data/technology-icons";
import { useImageZoom } from "../../hooks/use-image-zoom";
import type { ImageAsset } from "../../resume-data";
import {
  enhanceTechnologyIcon,
  type TechnologyIconBackground,
  type TechnologyIconPresentation,
} from "../../services/technology-icon-contrast";
import { codeIcon, resizeIcon } from "./material-icons";

export interface TechnologyIconProps {
  icon?: TechnologyIconMetadata | null;
  label: string;
  className?: string;
}

interface EnhancedIcon extends TechnologyIconPresentation {
  key: string;
}

interface IconPresentation {
  logo: ImageAsset;
  background: TechnologyIconBackground;
}

interface BrandIconProps {
  presentation: IconPresentation;
  label: string;
  className: string;
  onError: () => void;
}

const CONTAINER_CLASS =
  "technology-icon-container inline-grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-[0.3rem]";
const DARK_BACKGROUND: TechnologyIconBackground = "#0d1b2d";
const FALLBACK_ICON_SIZE = 18;
const fallbackGlyph = resizeIcon(codeIcon, FALLBACK_ICON_SIZE);

function FallbackIcon({ className }: { className: string }) {
  return (
    <span className={`${CONTAINER_CLASS} ${className}`} aria-hidden="true">
      <span className="technology-fallback-icon inline-flex text-muted">
        <Icon glyph={fallbackGlyph} />
      </span>
    </span>
  );
}

function useEnhancedIcon(
  icon: TechnologyIconMetadata | null | undefined,
): EnhancedIcon | null {
  const [enhanced, setEnhanced] = useState<EnhancedIcon | null>(null);
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
        if (active && result.src !== src) {
          setEnhanced({ key, ...result });
        }
      })
      .catch(() => {
        // The original image remains usable if enhancement fails.
      });
    return () => {
      active = false;
    };
  }, [src, width, height, key]);

  return enhanced?.key === key ? enhanced : null;
}

function choosePresentation(
  icon: TechnologyIconMetadata,
  enhanced: EnhancedIcon | null,
): IconPresentation {
  if (!enhanced) {
    return { logo: icon, background: "#ffffff" };
  }

  return {
    logo: {
      src: enhanced.src,
      width: icon.width,
      height: icon.height,
      surface: enhanced.background === DARK_BACKGROUND ? "dark" : "light",
    },
    background: enhanced.background,
  };
}

function BrandIcon({
  presentation,
  label,
  className,
  onError,
}: BrandIconProps) {
  const { logo, background } = presentation;
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const zoom = useImageZoom({ logo, label, background });
  const isLoading = loadedSrc !== logo.src;
  const tone = background === DARK_BACKGROUND ? "dark" : "light";

  return (
    <span
      className={`${CONTAINER_CLASS} technology-icon-frame technology-icon-frame--${tone} border border-solid border-outline p-px ${className}`}
      style={{ backgroundColor: background }}
      aria-hidden="true"
    >
      {isLoading && (
        <span className="technology-icon-loader col-start-1 row-start-1">
          <LoaderInline />
        </span>
      )}
      <img
        {...zoom}
        src={logo.src}
        alt=""
        width={logo.width}
        height={logo.height}
        loading="lazy"
        className={`technology-brand-icon col-start-1 row-start-1 block h-full w-full object-contain${isLoading ? " invisible" : ""}`}
        onLoad={() => {
          zoom.onLoad();
          setLoadedSrc(logo.src);
        }}
        onError={() => {
          zoom.onError();
          onError();
        }}
        data-label={label}
      />
    </span>
  );
}

export function TechnologyIcon({
  icon,
  label,
  className = "",
}: TechnologyIconProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [failedEnhancement, setFailedEnhancement] = useState<string | null>(
    null,
  );
  const enhanced = useEnhancedIcon(icon);

  if (!icon || failedSrc === icon.src) {
    return <FallbackIcon className={className} />;
  }

  const usableEnhancement =
    enhanced && enhanced.src !== failedEnhancement ? enhanced : null;
  const presentation = choosePresentation(icon, usableEnhancement);

  return (
    <BrandIcon
      presentation={presentation}
      label={label}
      className={className}
      onError={() => {
        if (usableEnhancement) {
          setFailedEnhancement(usableEnhancement.src);
        } else {
          setFailedSrc(icon.src);
        }
      }}
    />
  );
}

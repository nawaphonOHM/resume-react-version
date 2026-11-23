import type { ImageAsset } from "../../resume-data";
import { getImageZoomHandlers, type SelectZoomImage } from "./image-zoom";

export interface LogoButtonProps {
  asset: ImageAsset;
  alt: string;
  onSelectImage: SelectZoomImage;
  touchZoom?: boolean;
}

export function LogoButton({
  asset,
  alt,
  onSelectImage,
  touchZoom = true,
}: LogoButtonProps) {
  const surfaceClass =
    asset.surface === "dark"
      ? "border-slate-800 bg-slate-950"
      : "border-[color:var(--app-border)] bg-white/90";

  return (
    <button
      type="button"
      {...getImageZoomHandlers({ ...asset, alt }, onSelectImage, touchZoom)}
      aria-label={`Open enlarged ${alt}`}
      className={`inline-flex min-h-20 items-center justify-center rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-lg ${surfaceClass}`}
    >
      <img
        src={asset.src}
        alt={alt}
        className="max-h-16 w-auto object-contain"
        loading="lazy"
      />
    </button>
  );
}

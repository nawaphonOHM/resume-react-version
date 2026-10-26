import type { ImageAsset } from "../../resume-data";

export interface LogoButtonProps {
  asset: ImageAsset;
  alt: string;
  onClick: () => void;
}

export function LogoButton({ asset, alt, onClick }: LogoButtonProps) {
  const surfaceClass =
    asset.surface === "dark"
      ? "border-slate-800 bg-slate-950"
      : "border-[color:var(--app-border)] bg-white/90";

  return (
    <button
      type="button"
      onClick={() => {
        onClick();
      }}
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

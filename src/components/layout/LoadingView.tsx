import ProgressBar from "@jetbrains/ring-ui-built/components/progress-bar/progress-bar";

export interface LoadingViewProps {
  progress: number;
}

export function LoadingView({ progress }: LoadingViewProps) {
  return (
    <div
      className="resume-page-loading flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-[clamp(4rem,10vw,8rem)] text-center"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="resume-page-loading-bar">
        <ProgressBar
          max={100}
          value={Math.round(progress)}
          label="Loading resume data"
        />
      </div>
      <p className="resume-page-loading-text m-0 text-base font-medium text-muted">
        Loading resume data...
      </p>
    </div>
  );
}

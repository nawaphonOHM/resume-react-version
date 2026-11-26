import Button from "@jetbrains/ring-ui-built/components/button/button";
import { ControlsHeight } from "@jetbrains/ring-ui-built/components/global/controls-height";

export interface ErrorViewProps {
  onRetry: () => void;
  message?: string;
}

export function ErrorView({
  onRetry,
  message = "An error occurred while loading the resume data. Please try again.",
}: ErrorViewProps) {
  return (
    <div
      className="resume-page-error mx-auto my-8 flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-6 py-[clamp(3rem,8vw,6rem)] text-center text-ink"
      role="alert"
      aria-live="assertive"
    >
      <h2 className="resume-page-error-title m-0 text-[clamp(1.5rem,3vw,2rem)] font-bold">
        Unable to load resume
      </h2>
      <p className="resume-page-error-message m-0 max-w-md leading-relaxed text-muted">
        {message}
      </p>
      <span className="resume-page-retry">
        <Button
          primary
          height={ControlsHeight.L}
          onClick={() => {
            onRetry();
          }}
        >
          Retry
        </Button>
      </span>
    </div>
  );
}

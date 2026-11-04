import Button from "@jetbrains/ring-ui-built/components/button/button";

export interface ErrorViewProps {
  onRetry: () => void;
  message?: string;
}

export function ErrorView({
  onRetry,
  message = "Failed to load resume data. Please check your connection and try again.",
}: ErrorViewProps) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
      <div
        role="alert"
        aria-live="assertive"
        className="mx-auto max-w-md rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm"
      >
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[var(--app-heading)]">
          Failed to load resume data
        </h2>
        <p className="mt-2 text-sm text-[var(--app-muted)]">{message}</p>
        <div className="mt-6 flex justify-center">
          <Button
            primary
            onClick={() => {
              onRetry();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    </main>
  );
}

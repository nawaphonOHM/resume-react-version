export interface LoadingViewProps {
  progress: number;
}

export function LoadingView({ progress }: LoadingViewProps) {
  const roundedProgress = Math.round(progress);

  return (
    <main
      className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        role="progressbar"
        aria-valuenow={roundedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Loading resume data"
        className="mb-8 h-2.5 w-64 max-w-full overflow-hidden rounded-full bg-[var(--app-border)]"
      >
        <div
          className="h-full bg-[var(--app-accent)] transition-all duration-300 ease-out"
          style={{ width: `${String(roundedProgress)}%` }}
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--app-border)] border-t-[color:var(--app-accent)]"
          aria-hidden="true"
        />
        <p className="text-lg font-medium text-[var(--app-heading)]">
          Loading resume data...
        </p>
        <p className="text-sm text-[var(--app-muted)]">
          {roundedProgress}% completed
        </p>
      </div>
    </main>
  );
}

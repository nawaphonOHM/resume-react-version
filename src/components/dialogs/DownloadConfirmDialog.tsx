import { useDialogFocusTrap } from "../../hooks/use-dialog-focus-trap";

export interface DownloadConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DownloadConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
}: DownloadConfirmDialogProps) {
  const { containerRef, initialFocusRef } = useDialogFocusTrap({
    isOpen,
    onClose,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 p-4 no-print"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="download-confirm-title"
      aria-describedby="download-confirm-description"
      onClick={() => {
        onClose();
      }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-md rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-2xl"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2
          id="download-confirm-title"
          className="text-xl font-semibold text-[var(--app-heading)]"
        >
          Confirm download
        </h2>
        <p
          id="download-confirm-description"
          className="mt-3 text-sm leading-7 text-[var(--app-muted)]"
        >
          The hosted résumé PDF may be unavailable. Do you want to continue the
          download anyway?
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-[color:var(--app-border)] px-4 py-2 text-sm font-medium text-[var(--app-heading)] transition hover:border-[color:var(--app-accent)]"
            onClick={() => {
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            ref={initialFocusRef}
            type="button"
            className="inline-flex items-center rounded-full bg-[var(--app-accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            onClick={() => {
              onConfirm();
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

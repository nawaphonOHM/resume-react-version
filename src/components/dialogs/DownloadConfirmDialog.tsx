import Confirm from "@jetbrains/ring-ui-built/components/confirm/confirm";

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
  return (
    <Confirm
      show={isOpen}
      text="Confirm Download"
      description="The file may be unavailable. Do you confirm to continue?"
      confirmLabel="Continue"
      rejectLabel="Cancel"
      rejectOnEsc={false}
      onConfirm={onConfirm}
      onReject={onClose}
    />
  );
}

import { useDialogFocusTrap } from "../../hooks/use-dialog-focus-trap";

export interface ZoomImage {
  src: string;
  alt: string;
}

export interface ImageZoomDialogProps {
  image: ZoomImage | null;
  onClose: () => void;
}

export function ImageZoomDialog({ image, onClose }: ImageZoomDialogProps) {
  const isOpen = image !== null;
  const { containerRef, initialFocusRef } = useDialogFocusTrap({
    isOpen,
    onClose,
  });

  if (!image) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zoom-dialog-title"
      aria-describedby="zoom-dialog-description"
      onClick={() => {
        onClose();
      }}
    >
      <div
        ref={containerRef}
        className="relative flex max-w-full flex-col items-center"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2
          id="zoom-dialog-title"
          className="mb-3 text-lg font-semibold text-white"
        >
          Logo preview
        </h2>
        <button
          ref={initialFocusRef}
          type="button"
          aria-label="Close logo preview"
          onClick={() => {
            onClose();
          }}
          className="mb-3 self-end rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white"
        >
          Close
        </button>
        <img
          src={image.src}
          alt={image.alt}
          className="max-h-[85vh] max-w-full rounded-3xl bg-white p-6 shadow-2xl"
        />
        <p id="zoom-dialog-description" className="mt-3 text-sm text-white">
          {image.alt}
        </p>
      </div>
    </div>
  );
}

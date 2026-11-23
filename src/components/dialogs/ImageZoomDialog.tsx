import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ZoomImage } from "../common/image-zoom";
import "./ImageZoomDialog.css";

export type { ZoomImage } from "../common/image-zoom";

export interface ImageZoomDialogProps {
  image: ZoomImage | null;
  onClose: () => void;
}

interface PreviewGeometry {
  left: number;
  top: number;
  maxImageWidth: number;
  maxImageHeight: number;
}

const VIEWPORT_MARGIN = 16;
const ORIGIN_GAP = 12;
const IMAGE_MAX_VIEWPORT_RATIO = 0.2;
const PANEL_CHROME = 26;
const DOWNSCALE_TOLERANCE = 0.01;

function getSourceImage(origin: HTMLElement): HTMLImageElement | null {
  if (
    typeof HTMLImageElement !== "undefined" &&
    origin instanceof HTMLImageElement
  ) {
    return origin;
  }
  return origin.querySelector("img");
}

function getIntrinsicSize(image: ZoomImage, source: HTMLImageElement) {
  const width = source.naturalWidth || image.width || 0;
  const height = source.naturalHeight || image.height || 0;
  return width > 0 && height > 0 ? { width, height } : null;
}

function getContentBox(source: HTMLImageElement) {
  const rect = source.getBoundingClientRect();
  let width = rect.width;
  let height = rect.height;
  const view = source.ownerDocument.defaultView;
  const cssPixels = (value: string) => Number.parseFloat(value) || 0;

  if (view) {
    const styles = view.getComputedStyle(source);
    width -=
      cssPixels(styles.borderLeftWidth) +
      cssPixels(styles.borderRightWidth) +
      cssPixels(styles.paddingLeft) +
      cssPixels(styles.paddingRight);
    height -=
      cssPixels(styles.borderTopWidth) +
      cssPixels(styles.borderBottomWidth) +
      cssPixels(styles.paddingTop) +
      cssPixels(styles.paddingBottom);
  }

  return { width: Math.max(width, 0), height: Math.max(height, 0) };
}

function isUsefulEnlargement(image: ZoomImage, source: HTMLImageElement) {
  if (isBrokenLoadedImage(source)) {
    return false;
  }
  const intrinsic = getIntrinsicSize(image, source);
  const content = getContentBox(source);
  if (!intrinsic || !hasPositiveDimensions(content)) {
    return false;
  }

  const scale = Math.min(
    content.width / intrinsic.width,
    content.height / intrinsic.height,
  );
  return Number.isFinite(scale) && scale < 1 - DOWNSCALE_TOLERANCE;
}

function isBrokenLoadedImage(source: HTMLImageElement) {
  return (
    source.complete && Boolean(source.currentSrc) && source.naturalWidth === 0
  );
}

function hasPositiveDimensions({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return width > 0 && height > 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

interface ViewportSize {
  width: number;
  height: number;
}

function getMaximumImageSize({ width, height }: ViewportSize) {
  return {
    width: Math.min(
      width * IMAGE_MAX_VIEWPORT_RATIO,
      Math.max(width - VIEWPORT_MARGIN * 2 - PANEL_CHROME, 0),
    ),
    height: Math.min(
      height * IMAGE_MAX_VIEWPORT_RATIO,
      Math.max(height - VIEWPORT_MARGIN * 2 - PANEL_CHROME, 0),
    ),
  };
}

interface PanelSizeInput {
  intrinsic: { width: number; height: number };
  maximum: { width: number; height: number };
}

function getPanelSize({ intrinsic, maximum }: PanelSizeInput) {
  return {
    width: Math.min(intrinsic.width, maximum.width) + PANEL_CHROME,
    height: Math.min(intrinsic.height, maximum.height) + PANEL_CHROME,
  };
}

interface PreviewPositionInput {
  origin: DOMRect;
  panel: { width: number; height: number };
  viewport: ViewportSize;
}

function getPreviewPosition({ origin, panel, viewport }: PreviewPositionInput) {
  const centered = {
    left: origin.left + (origin.width - panel.width) / 2,
    top: origin.top + (origin.height - panel.height) / 2,
  };
  const positions = [
    { left: origin.right + ORIGIN_GAP, top: centered.top },
    { left: origin.left - ORIGIN_GAP - panel.width, top: centered.top },
    { left: centered.left, top: origin.bottom + ORIGIN_GAP },
    { left: centered.left, top: origin.top - ORIGIN_GAP - panel.height },
  ];
  return (
    positions.find(
      ({ left, top }) =>
        left >= VIEWPORT_MARGIN &&
        top >= VIEWPORT_MARGIN &&
        left + panel.width <= viewport.width - VIEWPORT_MARGIN &&
        top + panel.height <= viewport.height - VIEWPORT_MARGIN,
    ) ?? { left: origin.right + ORIGIN_GAP, top: centered.top }
  );
}

function calculateGeometry(
  image: ZoomImage,
  source: HTMLImageElement,
): PreviewGeometry | null {
  const intrinsic = getIntrinsicSize(image, source);
  const view = source.ownerDocument.defaultView;
  if (!intrinsic || !view || !isUsefulEnlargement(image, source)) {
    return null;
  }

  const viewport = { width: view.innerWidth, height: view.innerHeight };
  const maximum = getMaximumImageSize(viewport);
  const panel = getPanelSize({ intrinsic, maximum });
  const position = getPreviewPosition({
    origin: source.getBoundingClientRect(),
    panel,
    viewport,
  });

  return {
    left: clamp(
      position.left,
      VIEWPORT_MARGIN,
      viewport.width - VIEWPORT_MARGIN - panel.width,
    ),
    top: clamp(
      position.top,
      VIEWPORT_MARGIN,
      viewport.height - VIEWPORT_MARGIN - panel.height,
    ),
    maxImageWidth: maximum.width,
    maxImageHeight: maximum.height,
  };
}

function applyPreviewGeometry(
  preview: HTMLDivElement,
  image: ZoomImage,
  source: HTMLImageElement,
): boolean {
  const geometry = calculateGeometry(image, source);
  if (!geometry) {
    return false;
  }

  preview.style.left = `${String(geometry.left)}px`;
  preview.style.top = `${String(geometry.top)}px`;
  preview.style.setProperty(
    "--image-zoom-image-max-width",
    `${String(geometry.maxImageWidth)}px`,
  );
  preview.style.setProperty(
    "--image-zoom-image-max-height",
    `${String(geometry.maxImageHeight)}px`,
  );
  return true;
}

export function ImageZoomDialog({ image, onClose }: ImageZoomDialogProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const previewImageRef = useRef<HTMLImageElement>(null);
  const updatePositionRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    if (!image) return;
    return setupZoomPreview({
      image,
      preview: previewRef.current,
      onClose,
      setUpdatePosition: (updatePosition) => {
        updatePositionRef.current = updatePosition;
      },
    });
  }, [image, onClose]);

  if (!image || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={previewRef}
      className={`image-zoom-preview image-zoom-preview--${image.surface ?? "light"} no-print`}
      data-image-zoom-preview
      aria-hidden="true"
      style={{
        position: "fixed",
        visibility: "hidden",
      }}
    >
      <img
        ref={previewImageRef}
        className="image-zoom-preview__image"
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        draggable={false}
        onLoad={() => {
          updatePositionRef.current();
        }}
        onError={onClose}
      />
    </div>,
    document.body,
  );
}

function createPositionUpdater({
  preview,
  image,
  source,
  onClose,
}: {
  preview: HTMLDivElement | null;
  image: ZoomImage;
  source: HTMLImageElement;
  onClose: () => void;
}) {
  return () => {
    if (!preview) return;
    preview.style.visibility = "hidden";
    if (
      !image.origin.isConnected ||
      !applyPreviewGeometry(preview, image, source)
    ) {
      onClose();
      return;
    }
    preview.style.visibility = "visible";
  };
}

interface ZoomPreviewSetupInput {
  image: ZoomImage;
  preview: HTMLDivElement | null;
  onClose: () => void;
  setUpdatePosition: (updatePosition: () => void) => void;
}

function setupZoomPreview({
  image,
  preview,
  onClose,
  setUpdatePosition,
}: ZoomPreviewSetupInput) {
  const source = getSourceImage(image.origin);
  if (!source) {
    onClose();
    return;
  }
  const updatePosition = createPositionUpdater({
    preview,
    image,
    source,
    onClose,
  });
  setUpdatePosition(updatePosition);
  updatePosition();
  const removeListeners = installPreviewListeners({
    image,
    source,
    onClose,
    updatePosition,
  });
  return () => {
    setUpdatePosition(() => {});
    removeListeners();
  };
}

interface PreviewListenerInput {
  image: ZoomImage;
  source: HTMLImageElement;
  onClose: () => void;
  updatePosition: () => void;
}

function installPreviewListeners({
  image,
  source,
  onClose,
  updatePosition,
}: PreviewListenerInput) {
  const closeOnOutsidePointer = (event: PointerEvent) => {
    handleOutsidePointer(image, onClose, event);
  };
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") onClose();
  };
  document.addEventListener("pointerdown", closeOnOutsidePointer);
  document.addEventListener("keydown", closeOnEscape);
  window.addEventListener("resize", updatePosition);
  window.addEventListener("scroll", updatePosition, true);
  const resizeObserver = observePreviewResize(source, updatePosition);

  return () => {
    document.removeEventListener("pointerdown", closeOnOutsidePointer);
    document.removeEventListener("keydown", closeOnEscape);
    window.removeEventListener("resize", updatePosition);
    window.removeEventListener("scroll", updatePosition, true);
    resizeObserver?.disconnect();
  };
}

function handleOutsidePointer(
  image: ZoomImage,
  onClose: () => void,
  event: PointerEvent,
) {
  const target = event.target;
  const trigger = image.origin.closest("button, a") ?? image.origin;
  if (target instanceof Node && !trigger.contains(target)) onClose();
}

function observePreviewResize(
  source: HTMLImageElement,
  updatePosition: () => void,
) {
  const ResizeObserverConstructor = globalThis.ResizeObserver;
  if (typeof ResizeObserverConstructor !== "function") return null;
  const observer = new ResizeObserverConstructor(updatePosition);
  observer.observe(source);
  return observer;
}

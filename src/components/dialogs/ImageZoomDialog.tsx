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

// eslint-disable-next-line complexity
function isUsefulEnlargement(image: ZoomImage, source: HTMLImageElement) {
  if (source.complete && source.currentSrc && source.naturalWidth === 0) {
    return false;
  }
  const intrinsic = getIntrinsicSize(image, source);
  const content = getContentBox(source);
  if (!intrinsic || content.width <= 0 || content.height <= 0) {
    return false;
  }

  const scale = Math.min(
    content.width / intrinsic.width,
    content.height / intrinsic.height,
  );
  return Number.isFinite(scale) && scale < 1 - DOWNSCALE_TOLERANCE;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

// eslint-disable-next-line max-statements
function calculateGeometry(
  image: ZoomImage,
  source: HTMLImageElement,
): PreviewGeometry | null {
  const intrinsic = getIntrinsicSize(image, source);
  const view = source.ownerDocument.defaultView;
  if (!intrinsic || !view || !isUsefulEnlargement(image, source)) {
    return null;
  }

  const viewportWidth = view.innerWidth;
  const viewportHeight = view.innerHeight;
  const maxImageWidth = Math.min(
    viewportWidth * IMAGE_MAX_VIEWPORT_RATIO,
    Math.max(viewportWidth - VIEWPORT_MARGIN * 2 - PANEL_CHROME, 0),
  );
  const maxImageHeight = Math.min(
    viewportHeight * IMAGE_MAX_VIEWPORT_RATIO,
    Math.max(viewportHeight - VIEWPORT_MARGIN * 2 - PANEL_CHROME, 0),
  );
  const panelWidth = Math.min(intrinsic.width, maxImageWidth) + PANEL_CHROME;
  const panelHeight = Math.min(intrinsic.height, maxImageHeight) + PANEL_CHROME;
  const originRect = source.getBoundingClientRect();
  const centeredTop = originRect.top + (originRect.height - panelHeight) / 2;
  const centeredLeft = originRect.left + (originRect.width - panelWidth) / 2;
  const positions = [
    { left: originRect.right + ORIGIN_GAP, top: centeredTop },
    { left: originRect.left - ORIGIN_GAP - panelWidth, top: centeredTop },
    { left: centeredLeft, top: originRect.bottom + ORIGIN_GAP },
    { left: centeredLeft, top: originRect.top - ORIGIN_GAP - panelHeight },
  ];
  const position = positions.find(
    ({ left, top }) =>
      left >= VIEWPORT_MARGIN &&
      top >= VIEWPORT_MARGIN &&
      left + panelWidth <= viewportWidth - VIEWPORT_MARGIN &&
      top + panelHeight <= viewportHeight - VIEWPORT_MARGIN,
  ) ?? { left: originRect.right + ORIGIN_GAP, top: centeredTop };

  return {
    left: clamp(
      position.left,
      VIEWPORT_MARGIN,
      viewportWidth - VIEWPORT_MARGIN - panelWidth,
    ),
    top: clamp(
      position.top,
      VIEWPORT_MARGIN,
      viewportHeight - VIEWPORT_MARGIN - panelHeight,
    ),
    maxImageWidth,
    maxImageHeight,
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

  // eslint-disable-next-line max-statements
  useLayoutEffect(() => {
    if (!image) {
      return;
    }

    const source = getSourceImage(image.origin);
    if (!source) {
      onClose();
      return;
    }

    const updatePosition = () => {
      const preview = previewRef.current;
      if (!preview) {
        return;
      }
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
    updatePositionRef.current = updatePosition;
    updatePosition();

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      const trigger = image.origin.closest("button, a") ?? image.origin;
      if (target instanceof Node && !trigger.contains(target)) {
        onClose();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const ResizeObserverConstructor = globalThis.ResizeObserver;
    const resizeObserver =
      typeof ResizeObserverConstructor === "function"
        ? new ResizeObserverConstructor(updatePosition)
        : null;
    resizeObserver?.observe(source);

    return () => {
      updatePositionRef.current = () => {};
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resizeObserver?.disconnect();
    };
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

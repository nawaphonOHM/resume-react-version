import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { ImageZoomRequest } from "./ImageZoomProvider";
import "./ImageZoomPreview.css";

export interface ImageZoomPreviewProps {
  request: ImageZoomRequest;
  onClose: () => void;
}

interface PreviewGeometry {
  left: number;
  top: number;
  maxImageWidth: number;
  maxImageHeight: number;
}

interface PreviewSize {
  width: number;
  height: number;
}

const VIEWPORT_MARGIN = 16;
const ORIGIN_GAP = 12;
const IMAGE_MAX_VIEWPORT_RATIO = 0.2;
const PANEL_CHROME = 26;

function getIntrinsicSize({
  logo,
  origin,
}: ImageZoomRequest): PreviewSize | null {
  const width = logo.width || origin.naturalWidth;
  const height = logo.height || origin.naturalHeight;
  return width > 0 && height > 0 ? { width, height } : null;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function getMaximumImageSize({ width, height }: PreviewSize): PreviewSize {
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

function getPanelSize(intrinsic: PreviewSize, maximum: PreviewSize) {
  return {
    width: Math.min(intrinsic.width, maximum.width) + PANEL_CHROME,
    height: Math.min(intrinsic.height, maximum.height) + PANEL_CHROME,
  };
}

interface PreviewPositionInput {
  origin: DOMRect;
  panel: PreviewSize;
  viewport: PreviewSize;
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

function calculateGeometry(request: ImageZoomRequest): PreviewGeometry | null {
  const intrinsic = getIntrinsicSize(request);
  const view = request.origin.ownerDocument.defaultView;
  if (!intrinsic || !view) {
    return null;
  }

  const viewport = { width: view.innerWidth, height: view.innerHeight };
  const maximum = getMaximumImageSize(viewport);
  const panel = getPanelSize(intrinsic, maximum);
  const position = getPreviewPosition({
    origin: request.origin.getBoundingClientRect(),
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
  request: ImageZoomRequest,
): boolean {
  const geometry = calculateGeometry(request);
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

function previewClassName({ logo, activation }: ImageZoomRequest): string {
  const surfaceClass = `image-zoom-preview image-zoom-preview--${logo.surface}`;
  return activation === "hover"
    ? `${surfaceClass} image-zoom-preview--pointer-transparent`
    : surfaceClass;
}

function previewStyle({ logo, background }: ImageZoomRequest): CSSProperties {
  return {
    position: "fixed",
    visibility: "hidden",
    backgroundColor: background,
    ["--image-zoom-intrinsic-width" as string]: `${String(logo.width)}px`,
    ["--image-zoom-intrinsic-height" as string]: `${String(logo.height)}px`,
  };
}

export function ImageZoomPreview({ request, onClose }: ImageZoomPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const updatePositionRef = useRef<() => void>(() => {});
  const { logo, label } = request;

  useLayoutEffect(() => {
    return setupZoomPreview({
      request,
      preview: previewRef.current,
      onClose,
      setUpdatePosition: (updatePosition) => {
        updatePositionRef.current = updatePosition;
      },
    });
  }, [request, onClose]);

  return createPortal(
    <div
      ref={previewRef}
      className={previewClassName(request)}
      data-image-zoom-preview=""
      data-image-zoom-surface={logo.surface}
      style={previewStyle(request)}
    >
      <img
        className="image-zoom-preview__image"
        src={logo.src}
        alt={label}
        width={logo.width}
        height={logo.height}
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

interface PositionUpdaterInput {
  request: ImageZoomRequest;
  preview: HTMLDivElement | null;
  onClose: () => void;
}

function createPositionUpdater({
  request,
  preview,
  onClose,
}: PositionUpdaterInput) {
  return () => {
    if (!preview) return;
    preview.style.visibility = "hidden";
    if (
      !request.origin.isConnected ||
      !applyPreviewGeometry(preview, request)
    ) {
      onClose();
      return;
    }
    preview.style.visibility = "visible";
  };
}

interface ZoomPreviewSetupInput extends PositionUpdaterInput {
  setUpdatePosition: (updatePosition: () => void) => void;
}

function setupZoomPreview({
  setUpdatePosition,
  ...input
}: ZoomPreviewSetupInput) {
  const updatePosition = createPositionUpdater(input);
  setUpdatePosition(updatePosition);
  updatePosition();
  const removeListeners = installPreviewListeners(
    input.request.origin,
    updatePosition,
  );
  return () => {
    setUpdatePosition(() => {});
    removeListeners();
  };
}

function installPreviewListeners(
  origin: HTMLImageElement,
  updatePosition: () => void,
) {
  window.addEventListener("resize", updatePosition);
  window.addEventListener("scroll", updatePosition, true);
  const resizeObserver = observeOriginResize(origin, updatePosition);

  return () => {
    window.removeEventListener("resize", updatePosition);
    window.removeEventListener("scroll", updatePosition, true);
    resizeObserver?.disconnect();
  };
}

function observeOriginResize(
  origin: HTMLImageElement,
  updatePosition: () => void,
) {
  const ResizeObserverConstructor = globalThis.ResizeObserver;
  if (typeof ResizeObserverConstructor !== "function") return null;
  const observer = new ResizeObserverConstructor(updatePosition);
  observer.observe(origin);
  return observer;
}

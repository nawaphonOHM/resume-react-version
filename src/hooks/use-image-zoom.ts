import {
  use,
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  ImageZoomContext,
  type ImageZoomActivation,
  type ImageZoomController,
  type ImageZoomRequest,
} from "../components/common/ImageZoomProvider";
import type { ImageAsset } from "../resume-data";

export interface UseImageZoomOptions {
  logo: ImageAsset;
  label: string;
  background?: string;
  touch?: boolean;
}

export interface ImageZoomImageProps {
  ref: RefObject<HTMLImageElement | null>;
  onPointerEnter: (event: PointerEvent<HTMLImageElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLImageElement>) => void;
  onClick: (event: MouseEvent<HTMLImageElement>) => void;
  onLoad: () => void;
  onError: () => void;
}

interface ImageSize {
  width: number;
  height: number;
}

const DOWNSCALE_TOLERANCE = 0.01;

function validSize(size: ImageSize): ImageSize | null {
  const valid =
    Number.isFinite(size.width) &&
    size.width > 0 &&
    Number.isFinite(size.height) &&
    size.height > 0;
  return valid ? size : null;
}

function cssPixels(value: string): number {
  const pixels = Number.parseFloat(value);
  return Number.isFinite(pixels) ? pixels : 0;
}

function measureContentBox(image: HTMLImageElement): ImageSize | null {
  const bounds = image.getBoundingClientRect();
  const styles = image.ownerDocument.defaultView?.getComputedStyle(image);
  if (!styles) {
    return validSize({ width: bounds.width, height: bounds.height });
  }

  return validSize({
    width:
      bounds.width -
      cssPixels(styles.borderLeftWidth) -
      cssPixels(styles.borderRightWidth) -
      cssPixels(styles.paddingLeft) -
      cssPixels(styles.paddingRight),
    height:
      bounds.height -
      cssPixels(styles.borderTopWidth) -
      cssPixels(styles.borderBottomWidth) -
      cssPixels(styles.paddingTop) -
      cssPixels(styles.paddingBottom),
  });
}

function isDownscaled(
  intrinsic: ImageSize | null,
  contentBox: ImageSize | null,
): boolean {
  if (!intrinsic || !contentBox) {
    return false;
  }

  const containedScale = Math.min(
    contentBox.width / intrinsic.width,
    contentBox.height / intrinsic.height,
  );
  return (
    Number.isFinite(containedScale) && containedScale < 1 - DOWNSCALE_TOLERANCE
  );
}

function isZoomEligible(image: HTMLImageElement, metadata: ImageSize): boolean {
  const intrinsic =
    validSize({ width: image.naturalWidth, height: image.naturalHeight }) ??
    validSize(metadata);
  return isDownscaled(intrinsic, measureContentBox(image));
}

function isHoverPointer(pointerType: string): boolean {
  return pointerType === "mouse" || pointerType === "pen";
}

function isTouchClick(event: MouseEvent<HTMLImageElement>): boolean {
  const nativeEvent: Event = event.nativeEvent;
  return "pointerType" in nativeEvent && nativeEvent.pointerType === "touch";
}

function useZoomEligibility(
  controller: ImageZoomController,
  { width, height }: ImageSize,
) {
  const imageRef = useRef<HTMLImageElement>(null);
  const failedRef = useRef(false);

  const evaluate = useCallback(
    (failed = failedRef.current): boolean => {
      const image = imageRef.current;
      failedRef.current = failed;
      if (!image) {
        return false;
      }

      const eligible = !failed && isZoomEligible(image, { width, height });
      if (!eligible) {
        controller.close(image);
      }
      return eligible;
    },
    [controller, width, height],
  );

  useEffect(() => {
    const image = imageRef.current;
    const ResizeObserverConstructor = globalThis.ResizeObserver;
    if (!image || typeof ResizeObserverConstructor !== "function") {
      return;
    }

    const observer = new ResizeObserverConstructor(() => {
      evaluate();
    });
    observer.observe(image);
    return () => {
      observer.disconnect();
    };
  }, [evaluate]);

  return { imageRef, evaluate };
}

export function useImageZoom({
  logo,
  label,
  background,
  touch = true,
}: UseImageZoomOptions): ImageZoomImageProps {
  const controller = use(ImageZoomContext);
  const { imageRef, evaluate } = useZoomEligibility(controller, logo);
  const { src, width, height, surface } = logo;

  // A preview shows the payload it was opened with, so a changed payload or an
  // unmounted image must release the preview this image owns.
  useEffect(() => {
    const image = imageRef.current;
    return () => {
      if (image) {
        controller.close(image);
      }
    };
  }, [controller, imageRef, src, width, height, surface, label, background]);

  const request = (
    origin: HTMLImageElement,
    activation: ImageZoomActivation,
  ): ImageZoomRequest => ({
    origin,
    logo,
    label,
    ...(background === undefined ? {} : { background }),
    activation,
  });

  return {
    ref: imageRef,
    onPointerEnter: (event) => {
      if (isHoverPointer(event.pointerType) && evaluate()) {
        controller.open(request(event.currentTarget, "hover"));
      }
    },
    onPointerLeave: (event) => {
      if (isHoverPointer(event.pointerType)) {
        controller.close(event.currentTarget, "hover");
      }
    },
    onClick: (event) => {
      if (isTouchClick(event) && touch && evaluate()) {
        controller.toggle(request(event.currentTarget, "touch"));
      }
    },
    onLoad: () => {
      evaluate(false);
    },
    onError: () => {
      evaluate(true);
    },
  };
}

export type ImageZoomActivation = "hover" | "hover-exit" | "touch" | "keyboard";

export interface ZoomImageAsset {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  surface?: "light" | "dark";
}

export interface ZoomImage extends ZoomImageAsset {
  origin: HTMLElement;
  activation: ImageZoomActivation;
}

export type SelectZoomImage = (image: ZoomImage) => void;

function resolveImageOrigin(element: HTMLElement): HTMLElement {
  if (
    typeof HTMLImageElement !== "undefined" &&
    element instanceof HTMLImageElement
  ) {
    return element;
  }
  return element.querySelector("img") ?? element;
}

export function getImageZoomHandlers<T extends HTMLElement>(
  image: ZoomImageAsset,
  onSelectImage: SelectZoomImage,
  touchZoom = true,
): {
  onPointerEnter: React.PointerEventHandler<T>;
  onPointerLeave: React.PointerEventHandler<T>;
  onClick: React.MouseEventHandler<T>;
} {
  return {
    onPointerEnter: (event) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
        return;
      }
      onSelectImage({
        ...image,
        origin: resolveImageOrigin(event.currentTarget),
        activation: "hover",
      });
    },
    onPointerLeave: (event) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
        return;
      }
      onSelectImage({
        ...image,
        origin: resolveImageOrigin(event.currentTarget),
        activation: "hover-exit",
      });
    },
    onClick: (event) => {
      const pointerType = (event.nativeEvent as { pointerType?: string })
        .pointerType;
      if (pointerType === "touch" && touchZoom) {
        onSelectImage({
          ...image,
          origin: resolveImageOrigin(event.currentTarget),
          activation: "touch",
        });
      } else if (event.detail === 0) {
        onSelectImage({
          ...image,
          origin: resolveImageOrigin(event.currentTarget),
          activation: "keyboard",
        });
      }
    },
  };
}

import { fireEvent } from "@testing-library/react";
import { expect, vi } from "vitest";

export interface ImageGeometry {
  natural?: { width: number; height: number };
  bounds?: DOMRect;
}

type HoverPointerType = "mouse" | "pen" | "touch";

const DOWNSCALED_GEOMETRY = {
  natural: { width: 128, height: 64 },
  bounds: new DOMRect(48, 48, 32, 16),
};

export function setImageGeometry(
  image: HTMLImageElement,
  { natural, bounds }: ImageGeometry = DOWNSCALED_GEOMETRY,
): void {
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: natural?.width ?? 0 },
    naturalHeight: { configurable: true, value: natural?.height ?? 0 },
  });
  vi.spyOn(image, "getBoundingClientRect").mockReturnValue(
    bounds ?? new DOMRect(),
  );
}

export function hoverImage(
  image: HTMLImageElement,
  pointerType: HoverPointerType = "mouse",
): void {
  fireEvent.pointerOver(image, { pointerType });
}

export function leaveImage(
  image: HTMLImageElement,
  pointerType: HoverPointerType = "mouse",
): void {
  fireEvent.pointerOut(image, { pointerType });
}

export function clickImage(
  image: HTMLImageElement,
  pointerType: HoverPointerType,
): void {
  fireEvent(
    image,
    new PointerEvent("click", { bubbles: true, cancelable: true, pointerType }),
  );
}

export function tapImage(image: HTMLImageElement): void {
  clickImage(image, "touch");
}

export function queryZoomPreview(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-image-zoom-preview]");
}

export function getZoomPreview(): HTMLElement {
  const preview = queryZoomPreview();
  if (!preview) throw new Error("Zoom preview was not rendered");
  return preview;
}

export function expectZoomPreview(label: string, src: string): void {
  const previewImage = getZoomPreview().querySelector("img");
  expect(previewImage?.getAttribute("alt")).toBe(label);
  expect(previewImage?.getAttribute("src")).toBe(src);
}

export function cssColor(color: string): string {
  const probe = document.createElement("span");
  probe.style.backgroundColor = color;
  return probe.style.backgroundColor;
}

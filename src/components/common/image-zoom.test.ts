import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { getImageZoomHandlers, type ZoomImageAsset } from "./image-zoom";

const image: ZoomImageAsset = {
  src: "/logo.svg",
  alt: "Logo",
  width: 128,
  height: 64,
};

function createOrigin() {
  const button = document.createElement("button");
  const source = document.createElement("img");
  button.append(source);
  return { button, source };
}

function pointerEvent(currentTarget: HTMLButtonElement, pointerType: string) {
  return { currentTarget, pointerType } as ReactPointerEvent<HTMLButtonElement>;
}

function clickEvent(
  currentTarget: HTMLButtonElement,
  pointerType: string,
  detail: number,
) {
  return {
    currentTarget,
    nativeEvent: { pointerType },
    detail,
  } as unknown as ReactMouseEvent<HTMLButtonElement>;
}

describe("image zoom handlers", () => {
  it("activates mouse and pen hover while ignoring touch hover", () => {
    const { button, source } = createOrigin();
    const onSelectImage = vi.fn();
    const handlers = getImageZoomHandlers(image, onSelectImage);

    handlers.onPointerEnter(pointerEvent(button, "touch"));
    expect(onSelectImage).not.toHaveBeenCalled();
    handlers.onPointerEnter(pointerEvent(button, "mouse"));
    expect(onSelectImage).toHaveBeenLastCalledWith({
      ...image,
      origin: source,
      activation: "hover",
    });
    handlers.onPointerLeave(pointerEvent(button, "pen"));
    expect(onSelectImage).toHaveBeenLastCalledWith({
      ...image,
      origin: source,
      activation: "hover-exit",
    });
  });

  it("supports touch clicks when enabled and keyboard clicks regardless", () => {
    const { button, source } = createOrigin();
    const onSelectImage = vi.fn();
    const handlers = getImageZoomHandlers(image, onSelectImage, false);

    handlers.onClick(clickEvent(button, "touch", 1));
    expect(onSelectImage).not.toHaveBeenCalled();
    handlers.onClick(clickEvent(button, "keyboard", 0));
    expect(onSelectImage).toHaveBeenLastCalledWith({
      ...image,
      origin: source,
      activation: "keyboard",
    });

    getImageZoomHandlers(image, onSelectImage, true).onClick(
      clickEvent(button, "touch", 1),
    );
    expect(onSelectImage).toHaveBeenLastCalledWith({
      ...image,
      origin: source,
      activation: "touch",
    });
  });
});

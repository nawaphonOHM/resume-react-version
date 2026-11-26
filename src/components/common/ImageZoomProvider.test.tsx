import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { use, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImageAsset } from "../../resume-data";
import {
  cssColor,
  getZoomPreview,
  queryZoomPreview,
  setImageGeometry,
} from "../../test-fixtures/image-zoom";
import {
  ImageZoomContext,
  ImageZoomProvider,
  type ImageZoomActivation,
  type ImageZoomController,
  type ImageZoomRequest,
} from "./ImageZoomProvider";

const logo: ImageAsset = {
  src: "https://ohm-mho.space/assets/wisesoft.png",
  width: 128,
  height: 64,
  surface: "light",
};

interface ControllerProbeProps {
  onReady: (controller: ImageZoomController) => void;
}

function ControllerProbe({ onReady }: ControllerProbeProps) {
  const controller = use(ImageZoomContext);

  useEffect(() => {
    onReady(controller);
  }, [controller, onReady]);

  return null;
}

function renderProvider() {
  const onReady = vi.fn<(controller: ImageZoomController) => void>();
  const view = render(
    <ImageZoomProvider>
      <ControllerProbe onReady={onReady} />
    </ImageZoomProvider>,
  );
  const controller = onReady.mock.lastCall?.[0];
  if (!controller) throw new Error("Image zoom controller was not provided");

  return { controller, unmount: view.unmount };
}

function createOrigin(bounds?: DOMRect): HTMLImageElement {
  const origin = document.createElement("img");
  setImageGeometry(origin, {
    natural: { width: 128, height: 64 },
    bounds: bounds ?? new DOMRect(48, 48, 32, 16),
  });
  document.body.append(origin);
  return origin;
}

function requestFor(
  origin: HTMLImageElement,
  activation: ImageZoomActivation = "hover",
  overrides: Partial<ImageZoomRequest> = {},
): ImageZoomRequest {
  return { origin, logo, label: "Wisesoft", activation, ...overrides };
}

function open(controller: ImageZoomController, request: ImageZoomRequest) {
  act(() => {
    controller.open(request);
  });
}

function close(
  controller: ImageZoomController,
  ...owner: Parameters<ImageZoomController["close"]>
) {
  act(() => {
    controller.close(...owner);
  });
}

function toggle(controller: ImageZoomController, request: ImageZoomRequest) {
  act(() => {
    controller.toggle(request);
  });
}

function setViewportSize(width: number, height: number) {
  vi.stubGlobal("innerWidth", width);
  vi.stubGlobal("innerHeight", height);
}

function previewImage(): HTMLImageElement {
  const image = getZoomPreview().querySelector("img");
  if (!image) throw new Error("Preview image was not rendered");
  return image;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("ImageZoomProvider preview", () => {
  it("renders nothing until an image requests a preview", () => {
    const { controller } = renderProvider();
    const origin = createOrigin();

    expect(queryZoomPreview()).toBeNull();
    expect(controller.isOpenFor(origin)).toBe(false);
  });

  it("renders the requested logo in a preview attached to the document", () => {
    const { controller } = renderProvider();

    open(controller, requestFor(createOrigin()));

    const preview = getZoomPreview();
    expect(preview.parentElement).toBe(document.body);
    expect(preview.classList.contains("image-zoom-preview--light")).toBe(true);
    expect(preview.getAttribute("data-image-zoom-surface")).toBe("light");
    expect(previewImage().getAttribute("src")).toBe(logo.src);
    expect(previewImage().getAttribute("alt")).toBe("Wisesoft");
    expect(previewImage().getAttribute("width")).toBe("128");
    expect(previewImage().getAttribute("height")).toBe("64");
  });

  it("reserves the intrinsic size of the logo for the preview image", () => {
    const { controller } = renderProvider();

    open(controller, requestFor(createOrigin()));

    const { style } = getZoomPreview();
    expect(style.getPropertyValue("--image-zoom-intrinsic-width")).toBe(
      "128px",
    );
    expect(style.getPropertyValue("--image-zoom-intrinsic-height")).toBe(
      "64px",
    );
    expect(style.backgroundColor).toBe("");
  });

  it("applies an exact background while keeping the logo surface", () => {
    const { controller } = renderProvider();
    const request = requestFor(createOrigin(), "hover", {
      logo: { ...logo, surface: "dark" },
      background: "#0d1b2d",
    });

    open(controller, request);

    const preview = getZoomPreview();
    expect(preview.style.backgroundColor).toBe(cssColor("#0d1b2d"));
    expect(preview.classList.contains("image-zoom-preview--dark")).toBe(true);
    expect(preview.getAttribute("data-image-zoom-surface")).toBe("dark");
  });

  it("makes only hover previews transparent to the pointer", () => {
    const { controller } = renderProvider();
    const origin = createOrigin();
    const transparentClass = "image-zoom-preview--pointer-transparent";

    open(controller, requestFor(origin, "hover"));
    expect(getZoomPreview().classList.contains(transparentClass)).toBe(true);

    close(controller);
    open(controller, requestFor(origin, "touch"));
    expect(getZoomPreview().classList.contains(transparentClass)).toBe(false);
  });
});

describe("ImageZoomProvider ownership", () => {
  it("replaces the active preview when another image opens", () => {
    const { controller } = renderProvider();
    const first = createOrigin();
    const second = createOrigin();

    open(controller, requestFor(first));
    open(controller, requestFor(second, "hover", { label: "Krungsri" }));

    expect(document.querySelectorAll("[data-image-zoom-preview]")).toHaveLength(
      1,
    );
    expect(previewImage().getAttribute("alt")).toBe("Krungsri");
    expect(controller.isOpenFor(first)).toBe(false);
    expect(controller.isOpenFor(second)).toBe(true);
  });

  it("keeps the current owner when the same image opens again", () => {
    const { controller } = renderProvider();
    const origin = createOrigin();

    open(controller, requestFor(origin, "touch"));
    open(controller, requestFor(origin, "hover"));

    expect(controller.isOpenFor(origin, "touch")).toBe(true);
    expect(controller.isOpenFor(origin, "hover")).toBe(false);
  });

  it("toggles the preview of the same image", () => {
    const { controller } = renderProvider();
    const origin = createOrigin();

    toggle(controller, requestFor(origin, "touch"));
    expect(controller.isOpenFor(origin, "touch")).toBe(true);

    toggle(controller, requestFor(origin, "touch"));
    expect(queryZoomPreview()).toBeNull();
  });

  it("closes only for a matching image and activation owner", () => {
    const { controller } = renderProvider();
    const origin = createOrigin();
    open(controller, requestFor(origin, "touch"));

    close(controller, createOrigin());
    close(controller, origin, "hover");
    expect(controller.isOpenFor(origin)).toBe(true);

    close(controller, origin, "touch");
    expect(queryZoomPreview()).toBeNull();
  });

  it("closes any preview when no owner is named", () => {
    const { controller } = renderProvider();
    open(controller, requestFor(createOrigin()));

    close(controller);

    expect(queryZoomPreview()).toBeNull();
  });
});

describe("ImageZoomProvider dismissal", () => {
  it("stays open for presses on the image and inside the preview", () => {
    const { controller } = renderProvider();
    const origin = createOrigin();
    open(controller, requestFor(origin, "touch"));

    fireEvent.pointerDown(origin);
    fireEvent.pointerDown(previewImage());

    expect(controller.isOpenFor(origin)).toBe(true);
  });

  it("closes on a pointer press outside the image and the preview", () => {
    const { controller } = renderProvider();
    open(controller, requestFor(createOrigin(), "touch"));

    fireEvent.pointerDown(document.body);

    expect(queryZoomPreview()).toBeNull();
  });

  it("closes on Escape and ignores other keys", () => {
    const { controller } = renderProvider();
    open(controller, requestFor(createOrigin()));

    fireEvent.keyDown(document, { key: "Enter" });
    expect(queryZoomPreview()).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(queryZoomPreview()).toBeNull();
  });

  it("closes when the preview image fails to load", () => {
    const { controller } = renderProvider();
    open(controller, requestFor(createOrigin()));

    fireEvent.error(previewImage());

    expect(queryZoomPreview()).toBeNull();
  });

  it("removes the preview and its listeners on unmount", () => {
    const removeListener = vi.spyOn(document, "removeEventListener");
    const { controller, unmount } = renderProvider();
    open(controller, requestFor(createOrigin()));

    unmount();

    const removedTypes = removeListener.mock.calls.map(([type]) => type);
    expect(queryZoomPreview()).toBeNull();
    expect(removedTypes).toContain("pointerdown");
    expect(removedTypes).toContain("keydown");
  });
});

describe("ImageZoomProvider placement", () => {
  it("anchors the preview beside its image inside the viewport", () => {
    const { controller } = renderProvider();
    const origin = createOrigin(new DOMRect(48, 100, 32, 16));

    open(controller, requestFor(origin));

    const { style } = getZoomPreview();
    expect(style.position).toBe("fixed");
    expect(style.visibility).toBe("visible");
    expect(style.left).toBe("92px");
    expect(style.top).toBe("63px");
  });

  it("leaves keyboard focus where it was", () => {
    const { controller } = renderProvider();
    const focused = document.createElement("button");
    document.body.append(focused);
    focused.focus();

    open(controller, requestFor(createOrigin(), "touch"));

    expect(queryZoomPreview()).not.toBeNull();
    expect(document.activeElement).toBe(focused);
  });

  it("falls back to another side when the right side has no room", () => {
    const { controller } = renderProvider();
    const origin = createOrigin(new DOMRect(960, 400, 32, 16));

    open(controller, requestFor(origin));

    expect(getZoomPreview().style.left).toBe("794px");
  });

  it("bounds the preview by the viewport after a resize", () => {
    const { controller } = renderProvider();
    open(controller, requestFor(createOrigin(new DOMRect(960, 720, 32, 16))));

    setViewportSize(375, 280);
    fireEvent(window, new Event("resize"));

    const { style } = getZoomPreview();
    expect(style.getPropertyValue("--image-zoom-image-max-width")).toBe("75px");
    expect(style.getPropertyValue("--image-zoom-image-max-height")).toBe(
      "56px",
    );
    expect(Number.parseFloat(style.left)).toBeLessThanOrEqual(258);
    expect(Number.parseFloat(style.top)).toBeLessThanOrEqual(182);
  });

  it("closes when its image has left the document", () => {
    const { controller } = renderProvider();
    const origin = createOrigin();
    open(controller, requestFor(origin));

    origin.remove();
    fireEvent(window, new Event("resize"));

    expect(queryZoomPreview()).toBeNull();
    expect(controller.isOpenFor(origin)).toBe(false);
  });
});

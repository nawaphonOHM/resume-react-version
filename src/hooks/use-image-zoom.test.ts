import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ImageZoomContext,
  type ImageZoomController,
} from "../components/common/ImageZoomProvider";
import type { ImageAsset } from "../resume-data";
import {
  clickImage,
  hoverImage,
  leaveImage,
  setImageGeometry,
  tapImage,
  type ImageGeometry,
} from "../test-fixtures/image-zoom";
import { useImageZoom, type UseImageZoomOptions } from "./use-image-zoom";

const logo: ImageAsset = {
  src: "https://ohm-mho.space/assets/wisesoft.png",
  width: 128,
  height: 64,
  surface: "light",
};

const defaultOptions: UseImageZoomOptions = { logo, label: "Wisesoft" };

class TestResizeObserver implements ResizeObserver {
  static instances: TestResizeObserver[] = [];

  readonly observed: Element[] = [];
  readonly disconnect = vi.fn();
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    TestResizeObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  unobserve(): void {}

  notify(): void {
    this.callback([], this);
  }
}

function installResizeObserver(): void {
  TestResizeObserver.instances = [];
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
}

function createController() {
  return {
    open: vi.fn<ImageZoomController["open"]>(),
    toggle: vi.fn<ImageZoomController["toggle"]>(),
    close: vi.fn<ImageZoomController["close"]>(),
    isOpenFor: vi.fn<ImageZoomController["isOpenFor"]>(() => false),
  };
}

function ZoomImage(options: UseImageZoomOptions) {
  return createElement("img", { ...useImageZoom(options), alt: "" });
}

function renderZoomImage(
  options: UseImageZoomOptions = defaultOptions,
  geometry?: ImageGeometry,
) {
  const controller = createController();
  const view = (current: UseImageZoomOptions) =>
    createElement(
      ImageZoomContext.Provider,
      { value: controller },
      createElement(ZoomImage, current),
    );
  const result = render(view(options));
  const image = result.container.querySelector("img");
  if (!image) throw new Error("Zoom image was not rendered");
  setImageGeometry(image, geometry);

  return {
    controller,
    image,
    unmount: result.unmount,
    update: (next: UseImageZoomOptions) => {
      result.rerender(view(next));
    },
  };
}

function sized(
  natural: [number, number],
  rendered: [number, number],
): ImageGeometry {
  return {
    natural: { width: natural[0], height: natural[1] },
    bounds: new DOMRect(0, 0, rendered[0], rendered[1]),
  };
}

function expectInert(geometry: ImageGeometry) {
  const { controller, image } = renderZoomImage(defaultOptions, geometry);
  hoverImage(image);
  tapImage(image);
  expect(controller.open).not.toHaveBeenCalled();
  expect(controller.toggle).not.toHaveBeenCalled();
  cleanup();
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useImageZoom hover", () => {
  it("opens a hover preview for mouse and pen on a downscaled image", () => {
    const { controller, image } = renderZoomImage();

    hoverImage(image, "mouse");
    hoverImage(image, "pen");

    expect(controller.open).toHaveBeenCalledTimes(2);
    expect(controller.open).toHaveBeenLastCalledWith({
      origin: image,
      logo,
      label: "Wisesoft",
      activation: "hover",
    });
  });

  it("releases only hover ownership when the pointer leaves", () => {
    const { controller, image } = renderZoomImage();

    leaveImage(image, "mouse");
    leaveImage(image, "pen");

    expect(controller.close).toHaveBeenCalledTimes(2);
    expect(controller.close).toHaveBeenLastCalledWith(image, "hover");
  });

  it("ignores touch pointers entering and leaving", () => {
    const { controller, image } = renderZoomImage();

    hoverImage(image, "touch");
    leaveImage(image, "touch");

    expect(controller.open).not.toHaveBeenCalled();
    expect(controller.close).not.toHaveBeenCalled();
  });

  it("includes an exact preview background only when one is given", () => {
    const { controller, image } = renderZoomImage({
      ...defaultOptions,
      background: "#0d1b2d",
    });

    hoverImage(image);

    expect(controller.open).toHaveBeenLastCalledWith({
      origin: image,
      logo,
      label: "Wisesoft",
      background: "#0d1b2d",
      activation: "hover",
    });
  });
});

describe("useImageZoom touch", () => {
  it("toggles a touch preview on a completed touch click", () => {
    const { controller, image } = renderZoomImage();

    tapImage(image);

    expect(controller.toggle).toHaveBeenCalledExactlyOnceWith({
      origin: image,
      logo,
      label: "Wisesoft",
      activation: "touch",
    });
  });

  it("does not treat mouse, pen or synthetic clicks as touch", () => {
    const { controller, image } = renderZoomImage();

    clickImage(image, "mouse");
    clickImage(image, "pen");
    fireEvent.click(image);

    expect(controller.toggle).not.toHaveBeenCalled();
  });

  it("leaves touch clicks alone when touch activation is disabled", () => {
    const { controller, image } = renderZoomImage({
      ...defaultOptions,
      touch: false,
    });

    tapImage(image);
    hoverImage(image);

    expect(controller.toggle).not.toHaveBeenCalled();
    expect(controller.open).toHaveBeenCalledOnce();
  });
});

describe("useImageZoom eligibility", () => {
  it("keeps full-size, upscaled and effectively equal images inert", () => {
    expectInert(sized([128, 64], [128, 64]));
    expectInert(sized([128, 64], [256, 128]));
    expectInert(sized([200, 100], [198.5, 99.25]));
  });

  it("opens once the image is downscaled beyond the 1 % tolerance", () => {
    const { controller, image } = renderZoomImage(
      defaultOptions,
      sized([200, 100], [197, 98.5]),
    );

    hoverImage(image);

    expect(controller.open).toHaveBeenCalledOnce();
  });

  it("uses the smaller axis ratio of a contained image", () => {
    const { controller, image } = renderZoomImage(
      defaultOptions,
      sized([128, 64], [128, 32]),
    );

    hoverImage(image);

    expect(controller.open).toHaveBeenCalledOnce();
  });

  it("compares against the content box, excluding border and padding", () => {
    const { controller, image } = renderZoomImage(
      defaultOptions,
      sized([128, 64], [140, 76]),
    );
    hoverImage(image);
    expect(controller.open).not.toHaveBeenCalled();

    image.style.padding = "8px";
    image.style.border = "2px solid black";
    hoverImage(image);

    expect(controller.open).toHaveBeenCalledOnce();
  });

  it("uses natural dimensions first and falls back to logo metadata", () => {
    const natural = renderZoomImage(
      { logo: { ...logo, width: 16, height: 8 }, label: "Wisesoft" },
      sized([128, 64], [32, 16]),
    );
    hoverImage(natural.image);
    expect(natural.controller.open).toHaveBeenCalledOnce();
    cleanup();

    const metadata = renderZoomImage(defaultOptions, {
      bounds: new DOMRect(0, 0, 32, 16),
    });
    hoverImage(metadata.image);
    expect(metadata.controller.open).toHaveBeenCalledOnce();
  });

  it("stays inert when neither natural size nor metadata is usable", () => {
    const { controller, image } = renderZoomImage(
      { logo: { ...logo, width: 0, height: 0 }, label: "Wisesoft" },
      { bounds: new DOMRect(0, 0, 32, 16) },
    );

    hoverImage(image);

    expect(controller.open).not.toHaveBeenCalled();
  });
});

describe("useImageZoom invalidation", () => {
  it("closes its preview after a load error and recovers after a later load", () => {
    const { controller, image } = renderZoomImage();

    fireEvent.error(image);
    hoverImage(image);
    expect(controller.close).toHaveBeenCalledWith(image);
    expect(controller.open).not.toHaveBeenCalled();

    fireEvent.load(image);
    hoverImage(image);
    expect(controller.open).toHaveBeenCalledOnce();
  });

  it("re-evaluates on resize and closes a preview that no longer enlarges", () => {
    installResizeObserver();
    const { controller, image } = renderZoomImage();
    const [observer] = TestResizeObserver.instances;
    expect(observer.observed).toEqual([image]);

    act(() => {
      observer.notify();
    });
    expect(controller.close).not.toHaveBeenCalled();

    setImageGeometry(image, sized([128, 64], [128, 64]));
    act(() => {
      observer.notify();
    });
    expect(controller.close).toHaveBeenCalledExactlyOnceWith(image);
  });

  it("recalculates right before activation without ResizeObserver", () => {
    const { controller, image } = renderZoomImage();
    hoverImage(image);
    expect(controller.open).toHaveBeenCalledOnce();

    setImageGeometry(image, sized([128, 64], [128, 64]));
    hoverImage(image);

    expect(controller.open).toHaveBeenCalledOnce();
    expect(controller.close).toHaveBeenCalledExactlyOnceWith(image);
  });

  it("releases a stale preview when the payload changes", () => {
    const { controller, image, update } = renderZoomImage();

    update(defaultOptions);
    expect(controller.close).not.toHaveBeenCalled();

    update({ logo, label: "Wisesoft Co., Ltd." });
    expect(controller.close).toHaveBeenCalledExactlyOnceWith(image);

    hoverImage(image);
    expect(controller.open).toHaveBeenLastCalledWith({
      origin: image,
      logo,
      label: "Wisesoft Co., Ltd.",
      activation: "hover",
    });
  });

  it("releases its preview and observer on unmount", () => {
    installResizeObserver();
    const { controller, image, unmount } = renderZoomImage();
    const [observer] = TestResizeObserver.instances;

    unmount();

    expect(controller.close).toHaveBeenCalledExactlyOnceWith(image);
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });
});

describe("useImageZoom without a provider", () => {
  it("renders an inert image", () => {
    const { container } = render(createElement(ZoomImage, defaultOptions));
    const image = container.querySelector("img");
    if (!image) throw new Error("Zoom image was not rendered");
    setImageGeometry(image);

    hoverImage(image);
    tapImage(image);

    expect(document.querySelector("[data-image-zoom-preview]")).toBeNull();
  });
});

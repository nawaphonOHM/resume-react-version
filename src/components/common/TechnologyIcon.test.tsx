import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageZoomProvider } from "./ImageZoomProvider";
import { TechnologyIcon } from "./TechnologyIcon";
import {
  enhanceTechnologyIcon,
  type TechnologyIconPresentation,
} from "../../services/technology-icon-contrast";
import type { TechnologyIconMetadata } from "../../data/technology-icons";
import {
  cssColor,
  getZoomPreview,
  hoverImage,
  queryZoomPreview,
  setImageGeometry,
} from "../../test-fixtures/image-zoom";

vi.mock("../../services/technology-icon-contrast", () => ({
  enhanceTechnologyIcon: vi.fn(),
}));

const ENHANCED_SRC = "data:image/png;base64,enhanced";
const LOADER_SELECTOR = '[data-test~="ring-loader-inline"]';

const mockLightIcon: TechnologyIconMetadata = {
  src: "https://ohm-mho.space/assets/react.svg",
  width: 24,
  height: 24,
  surface: "light",
};

const mockDarkIcon: TechnologyIconMetadata = {
  src: "https://ohm-mho.space/assets/aws.svg",
  width: 24,
  height: 24,
  surface: "dark",
};

function deferredEnhancement() {
  let resolve: (value: TechnologyIconPresentation) => void = () => {};
  const pending = new Promise<TechnologyIconPresentation>((settle) => {
    resolve = settle;
  });
  return {
    pending,
    resolve: async (value: TechnologyIconPresentation) => {
      await act(async () => {
        resolve(value);
        await Promise.resolve();
      });
    },
  };
}

function getImage(container: HTMLElement): HTMLImageElement {
  const image = container.querySelector("img");
  if (!image) throw new Error("Technology image was not rendered");
  return image;
}

function getFrame(container: HTMLElement): HTMLElement {
  const frame = container.querySelector<HTMLElement>(".technology-icon-frame");
  if (!frame) throw new Error("Technology icon frame was not rendered");
  return frame;
}

function expectIconSource(container: HTMLElement, src: string) {
  expect(getImage(container).getAttribute("src")).toBe(src);
}

function expectFrameBackground(
  container: HTMLElement,
  background: "#ffffff" | "#0d1b2d",
) {
  const frame = getFrame(container);
  const tone = background === "#0d1b2d" ? "dark" : "light";
  expect(frame.style.backgroundColor).toBe(cssColor(background));
  expect(frame.classList.contains(`technology-icon-frame--${tone}`)).toBe(true);
}

function expectLoading(container: HTMLElement, loading: boolean) {
  expect(container.querySelector(LOADER_SELECTOR) !== null).toBe(loading);
  expect(getImage(container).classList.contains("invisible")).toBe(loading);
}

function expectFallbackGlyph(container: HTMLElement) {
  expect(
    container.querySelector(".technology-fallback-icon svg"),
  ).not.toBeNull();
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector(LOADER_SELECTOR)).toBeNull();
}

async function renderEnhancedIcon(background: "#ffffff" | "#0d1b2d") {
  const enhancement = deferredEnhancement();
  vi.mocked(enhanceTechnologyIcon).mockReturnValue(enhancement.pending);
  const view = render(
    <ImageZoomProvider>
      <TechnologyIcon icon={mockLightIcon} label="React" />
    </ImageZoomProvider>,
  );
  await enhancement.resolve({ src: ENHANCED_SRC, background });
  return view;
}

beforeEach(() => {
  vi.mocked(enhanceTechnologyIcon).mockReset();
  vi.mocked(enhanceTechnologyIcon).mockImplementation((src) =>
    Promise.resolve({ src, background: "#ffffff" }),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TechnologyIcon rendering", () => {
  it("renders the original artwork as a decorative image", () => {
    const { container } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );

    const image = getImage(container);
    expect(image.getAttribute("src")).toBe(mockLightIcon.src);
    expect(image.getAttribute("width")).toBe("24");
    expect(image.getAttribute("height")).toBe("24");
    expect(image.getAttribute("alt")).toBe("");
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(image.getAttribute("data-label")).toBe("React");
    expect(getFrame(container).getAttribute("aria-hidden")).toBe("true");
  });

  it("starts every icon on the white frame until processing chooses one", () => {
    const light = render(<TechnologyIcon icon={mockLightIcon} label="React" />);
    expectFrameBackground(light.container, "#ffffff");
    light.unmount();

    const dark = render(<TechnologyIcon icon={mockDarkIcon} label="AWS" />);
    expectFrameBackground(dark.container, "#ffffff");
  });

  it("shows a loader until the image has loaded", () => {
    const { container } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );
    expectLoading(container, true);

    fireEvent.load(getImage(container));

    expectLoading(container, false);
  });

  it("shows the loader again when the icon changes", () => {
    const { container, rerender } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );
    fireEvent.load(getImage(container));

    rerender(<TechnologyIcon icon={mockDarkIcon} label="AWS" />);
    expectIconSource(container, mockDarkIcon.src);
    expectLoading(container, true);

    fireEvent.load(getImage(container));
    expectLoading(container, false);
  });
});

describe("TechnologyIcon fallback", () => {
  it("renders the code glyph when no icon is registered", () => {
    const missing = render(
      <TechnologyIcon icon={undefined} label="REST APIs" />,
    );
    expectFallbackGlyph(missing.container);
    missing.unmount();

    const empty = render(<TechnologyIcon icon={null} label="Caffeine" />);
    expectFallbackGlyph(empty.container);
    expect(enhanceTechnologyIcon).not.toHaveBeenCalled();
  });

  it("falls back to the code glyph when the image fails to load", () => {
    const { container } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );

    fireEvent.error(getImage(container));

    expectFallbackGlyph(container);
  });

  it("resets the error state when the icon changes", () => {
    const { container, rerender } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );
    fireEvent.error(getImage(container));

    rerender(<TechnologyIcon icon={mockDarkIcon} label="AWS" />);

    expectIconSource(container, mockDarkIcon.src);
  });
});

describe("TechnologyIcon contrast processing", () => {
  it("keeps the original while processing and then applies the result", async () => {
    const enhancement = deferredEnhancement();
    vi.mocked(enhanceTechnologyIcon).mockReturnValue(enhancement.pending);
    const { container } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );
    fireEvent.load(getImage(container));
    expectIconSource(container, mockLightIcon.src);

    await enhancement.resolve({ src: ENHANCED_SRC, background: "#0d1b2d" });

    expectIconSource(container, ENHANCED_SRC);
    expectFrameBackground(container, "#0d1b2d");
    expectLoading(container, true);
    expect(enhanceTechnologyIcon).toHaveBeenCalledWith(
      mockLightIcon.src,
      24,
      24,
    );
  });

  it("keeps the original presentation when processing changes nothing", async () => {
    const { container } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );
    fireEvent.load(getImage(container));

    await act(async () => {
      await Promise.resolve();
    });

    expectIconSource(container, mockLightIcon.src);
    expectFrameBackground(container, "#ffffff");
    expectLoading(container, false);
  });

  it("restores the original when the processed image cannot be shown", async () => {
    const { container } = await renderEnhancedIcon("#0d1b2d");

    fireEvent.error(getImage(container));
    expectIconSource(container, mockLightIcon.src);
    expectFrameBackground(container, "#ffffff");

    fireEvent.error(getImage(container));
    expectFallbackGlyph(container);
  });

  it("ignores stale results after the icon changes", async () => {
    const stale = deferredEnhancement();
    vi.mocked(enhanceTechnologyIcon)
      .mockReturnValueOnce(stale.pending)
      .mockResolvedValueOnce({
        src: "data:image/png;base64,aws",
        background: "#ffffff",
      });
    const { container, rerender } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );
    rerender(<TechnologyIcon icon={mockDarkIcon} label="AWS" />);
    await waitFor(() => {
      expectIconSource(container, "data:image/png;base64,aws");
    });

    await stale.resolve({ src: ENHANCED_SRC, background: "#0d1b2d" });

    expectIconSource(container, "data:image/png;base64,aws");
    expectFrameBackground(container, "#ffffff");
  });

  it("ignores a result that arrives after unmount", async () => {
    const enhancement = deferredEnhancement();
    vi.mocked(enhanceTechnologyIcon).mockReturnValue(enhancement.pending);
    const { container, unmount } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );
    unmount();

    await enhancement.resolve({ src: ENHANCED_SRC, background: "#0d1b2d" });

    expect(container.querySelector("img")).toBeNull();
  });

  it("keeps the original when processing rejects", async () => {
    vi.mocked(enhanceTechnologyIcon).mockRejectedValue(new Error("failed"));
    const { container } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expectIconSource(container, mockLightIcon.src);
    expectFrameBackground(container, "#ffffff");
  });
});

describe("TechnologyIcon zoom", () => {
  it("previews the processed artwork on the processed surface", async () => {
    const { container } = await renderEnhancedIcon("#0d1b2d");
    const image = getImage(container);
    setImageGeometry(image);

    hoverImage(image);

    const preview = getZoomPreview();
    const previewImage = preview.querySelector("img");
    expect(preview.style.backgroundColor).toBe(cssColor("#0d1b2d"));
    expect(preview.getAttribute("data-image-zoom-surface")).toBe("dark");
    expect(previewImage?.getAttribute("src")).toBe(ENHANCED_SRC);
    expect(previewImage?.getAttribute("alt")).toBe("React");
  });

  it("releases a preview of the original when the processed result arrives", async () => {
    const enhancement = deferredEnhancement();
    vi.mocked(enhanceTechnologyIcon).mockReturnValue(enhancement.pending);
    const { container } = render(
      <ImageZoomProvider>
        <TechnologyIcon icon={mockLightIcon} label="React" />
      </ImageZoomProvider>,
    );
    setImageGeometry(getImage(container));
    hoverImage(getImage(container));
    expect(getZoomPreview().style.backgroundColor).toBe(cssColor("#ffffff"));

    await enhancement.resolve({ src: ENHANCED_SRC, background: "#0d1b2d" });

    expect(queryZoomPreview()).toBeNull();
  });

  it("does not preview an image drawn at its natural size", () => {
    const { container } = render(
      <ImageZoomProvider>
        <TechnologyIcon icon={mockLightIcon} label="React" />
      </ImageZoomProvider>,
    );
    const image = getImage(container);
    setImageGeometry(image, {
      natural: { width: 24, height: 24 },
      bounds: new DOMRect(0, 0, 24, 24),
    });

    hoverImage(image);

    expect(queryZoomPreview()).toBeNull();
  });
});

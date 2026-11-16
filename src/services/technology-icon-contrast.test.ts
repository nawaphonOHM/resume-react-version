import { afterEach, describe, expect, it, vi } from "vitest";
import { createTechnologyIconEnhancer } from "./technology-icon-contrast";

interface FixtureOptions {
  pixels?: number[];
  enhanced?: number[][];
  image?: "load" | "error" | "hang";
  failClahe?: boolean;
  failCanvas?: boolean;
}

// eslint-disable-next-line max-statements
function fixture(options: FixtureOptions = {}) {
  const allocations: { delete: ReturnType<typeof vi.fn> }[] = [];
  const grids: number[][] = [];
  const written: number[][] = [];
  const images: {
    crossOrigin: string | null;
    decoding: string;
    src: string;
  }[] = [];
  let surface = 0;
  let width = 0;
  let height = 0;
  const pixels = options.pixels ?? [0, 0, 0, 255];

  class Mat {
    data = new Uint8Array();
    delete = vi.fn();
    constructor() {
      allocations.push(this);
    }
  }
  class MatVector {
    delete = vi.fn();
    constructor() {
      allocations.push(this);
    }
    get() {
      return new Mat();
    }
    push_back() {
      /* OpenCV owns the vector, not its inputs. */
    }
  }
  class Size {
    delete = vi.fn();
    constructor(w: number, h: number) {
      allocations.push(this);
      grids.push([w, h]);
    }
  }
  class CLAHE {
    delete = vi.fn();
    collectGarbage = vi.fn();
    constructor(clip: number) {
      expect(clip).toBe(2);
      allocations.push(this);
    }
    apply() {
      if (options.failClahe) throw new Error("CLAHE failed");
    }
  }
  const cv = {
    Mat,
    MatVector,
    Size,
    CLAHE,
    COLOR_RGBA2RGB: 1,
    COLOR_RGB2Lab: 2,
    COLOR_Lab2RGB: 3,
    matFromImageData: vi.fn((data: ImageData) => {
      width = data.width;
      height = data.height;
      return new Mat();
    }),
    cvtColor: vi.fn((_source: Mat, destination: Mat, code: number) => {
      if (code === 3) {
        const color = options.enhanced?.[surface++] ?? [0, 0, 0];
        destination.data = Uint8Array.from(
          Array.from({ length: width * height }, () => color).flat(),
        );
      }
    }),
    split: vi.fn(),
    merge: vi.fn(),
  };

  class FakeImage {
    crossOrigin: string | null = null;
    decoding = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) {
      images.push({
        src: value,
        crossOrigin: this.crossOrigin,
        decoding: this.decoding,
      });
      if (options.image === "hang") return;
      queueMicrotask(() =>
        options.image === "error" ? this.onerror?.() : this.onload?.(),
      );
    }
  }

  vi.stubGlobal("Image", FakeImage);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function getContext(this: HTMLCanvasElement) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const canvas = this;
      return {
        canvas,
        drawImage: vi.fn(),
        getImageData: () => {
          if (options.failCanvas) throw new Error("Tainted canvas");
          return {
            data: Uint8ClampedArray.from(
              Array.from({ length: canvas.width * canvas.height }, (_, i) =>
                pixels.slice(i * 4, i * 4 + 4).length === 4
                  ? pixels.slice(i * 4, i * 4 + 4)
                  : pixels.slice(0, 4),
              ).flat(),
            ),
          };
        },
        createImageData: (w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData: (data: ImageData) => {
          written.push(Array.from(data.data));
        },
      } as unknown as CanvasRenderingContext2D;
    },
  );
  const serialize = vi
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockReturnValue("data:image/png;base64,processed");
  return { cv, allocations, grids, written, images, serialize };
}

function serviceWith(loader: () => unknown) {
  return {
    enhanceTechnologyIcon: createTechnologyIconEnhancer(() =>
      Promise.resolve({ default: loader() }),
    ),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// eslint-disable-next-line max-statements
describe("enhanceTechnologyIcon", () => {
  // eslint-disable-next-line max-statements
  it("shares in-flight and successful results, while distinguishing dimensions and sources", async () => {
    const fake = fixture();
    const loader = vi.fn(() => fake.cv);
    const { enhanceTechnologyIcon } = serviceWith(loader);
    const first = enhanceTechnologyIcon("icon.svg", 1, 1);
    expect(enhanceTechnologyIcon("icon.svg", 1, 1)).toBe(first);
    await expect(first).resolves.toBe("data:image/png;base64,processed");
    await enhanceTechnologyIcon("icon.svg", 1, 1);
    await enhanceTechnologyIcon("icon.svg", 2, 1);
    await enhanceTechnologyIcon("other.svg", 1, 1);
    expect(loader).toHaveBeenCalledOnce();
    expect(fake.images).toEqual([
      { src: "icon.svg", crossOrigin: "anonymous", decoding: "async" },
      { src: "icon.svg", crossOrigin: "anonymous", decoding: "async" },
      { src: "other.svg", crossOrigin: "anonymous", decoding: "async" },
    ]);
    expect(
      fake.allocations.every((item) => item.delete.mock.calls.length === 1),
    ).toBe(true);
  });

  it("selects the enhanced candidate only when it increases contrast", async () => {
    const fake = fixture({
      pixels: [100, 100, 100, 255],
      enhanced: [
        [0, 0, 0],
        [13, 27, 45],
      ],
    });
    const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
    await enhanceTechnologyIcon("enhanced.svg", 1, 1);
    expect(fake.written[0]).toEqual([0, 0, 0, 255]);
    expect(fake.grids).toEqual([
      [2, 2],
      [2, 2],
    ]);
  });

  it("selects dark for light artwork and preserves alpha blending", async () => {
    const fake = fixture({
      pixels: [255, 255, 255, 128],
      enhanced: [
        [255, 255, 255],
        [255, 255, 255],
      ],
    });
    const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
    await enhanceTechnologyIcon("light.svg", 1, 1);
    expect(fake.written[0]).toEqual([134, 141, 150, 255]);
  });

  it("weights contrast by source alpha instead of counting faint pixels equally", async () => {
    const fake = fixture({
      pixels: [
        0,
        0,
        0,
        255,
        ...Array.from({ length: 8 }, () => [255, 255, 255, 128]).flat(),
      ],
      enhanced: [
        [255, 255, 255],
        [13, 27, 45],
      ],
    });
    const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
    await enhanceTechnologyIcon("weighted.svg", 9, 1);
    expect(fake.written[0].slice(0, 8)).toEqual([
      0, 0, 0, 255, 255, 255, 255, 255,
    ]);
  });

  it("clamps the CLAHE grid independently for each dimension", async () => {
    const fake = fixture();
    const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
    await enhanceTechnologyIcon("large.svg", 129, 40);
    expect(fake.grids).toEqual([
      [8, 3],
      [8, 3],
    ]);
  });

  it("chooses the original on ties and the light surface for transparent pixels", async () => {
    const fake = fixture({
      pixels: [100, 200, 30, 0],
      enhanced: [
        [0, 0, 0],
        [255, 255, 255],
      ],
    });
    const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
    await enhanceTechnologyIcon("transparent.svg", 1, 1);
    expect(fake.written[0]).toEqual([255, 255, 255, 255]);
  });

  it("cleans up partial allocations and retries a processing failure", async () => {
    const options: FixtureOptions = { failClahe: true };
    const fake = fixture(options);
    const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
    await expect(enhanceTechnologyIcon("retry.svg", 1, 1)).resolves.toBe(
      "retry.svg",
    );
    expect(fake.allocations.length).toBeGreaterThan(0);
    expect(
      fake.allocations.every((item) => item.delete.mock.calls.length === 1),
    ).toBe(true);
    options.failClahe = false;
    await expect(enhanceTechnologyIcon("retry.svg", 1, 1)).resolves.toContain(
      "data:image/png",
    );
  });

  it("falls back for image and canvas errors and invalid dimensions", async () => {
    const options: FixtureOptions = { image: "error" };
    const fake = fixture(options);
    const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
    await expect(enhanceTechnologyIcon("icon.svg", 1, 1)).resolves.toBe(
      "icon.svg",
    );
    options.image = "load";
    options.failCanvas = true;
    await expect(enhanceTechnologyIcon("icon.svg", 1, 1)).resolves.toBe(
      "icon.svg",
    );
    await expect(enhanceTechnologyIcon("icon.svg", 0, 1)).resolves.toBe(
      "icon.svg",
    );
    options.failCanvas = false;
    await expect(enhanceTechnologyIcon("icon.svg", 1, 1)).resolves.toContain(
      "data:image/png",
    );
  });

  it("bounds image loading and allows a later retry", async () => {
    const options: FixtureOptions = { image: "hang" };
    const fake = fixture(options);
    const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
    vi.useFakeTimers();
    const pending = enhanceTechnologyIcon("slow.svg", 1, 1);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(pending).resolves.toBe("slow.svg");
    options.image = "load";
    vi.useRealTimers();
    await expect(enhanceTechnologyIcon("slow.svg", 1, 1)).resolves.toContain(
      "data:image/png",
    );
  });

  it("unwraps nested asynchronous exports and waits for runtime initialization", async () => {
    const fake = fixture();
    const previous = vi.fn();
    const initializing: { onRuntimeInitialized?: () => void } = {
      onRuntimeInitialized: previous,
    };
    const enhanceTechnologyIcon = createTechnologyIconEnhancer(() =>
      Promise.resolve({ default: Promise.resolve({ default: initializing }) }),
    );
    const pending = enhanceTechnologyIcon("initializing.svg", 1, 1);
    await vi.waitFor(() => {
      expect(initializing.onRuntimeInitialized).not.toBe(previous);
    });
    Object.assign(initializing, fake.cv);
    initializing.onRuntimeInitialized?.();
    await expect(pending).resolves.toContain("data:image/png");
    expect(previous).toHaveBeenCalledOnce();
  });

  // eslint-disable-next-line max-statements
  it("bounds and shares stalled runtime attempts, then retries after failure", async () => {
    const fake = fixture();
    const loader = vi.fn((url: string): Promise<unknown> => {
      if (!url.endsWith("?retry=4")) return new Promise(() => {});
      return Promise.resolve({ default: fake.cv });
    });
    const enhanceTechnologyIcon = createTechnologyIconEnhancer(loader);
    vi.useFakeTimers();
    const first = enhanceTechnologyIcon("one.svg", 1, 1);
    const second = enhanceTechnologyIcon("two.svg", 1, 1);
    await vi.advanceTimersByTimeAsync(47_000);
    await expect(first).resolves.toBe("one.svg");
    await expect(second).resolves.toBe("two.svg");
    expect(loader.mock.calls.map(([url]) => url)).toEqual([
      "https://cdn.jsdelivr.net/npm/@techstark/opencv-js/+esm",
      "https://cdn.jsdelivr.net/npm/@techstark/opencv-js/+esm?retry=1",
      "https://cdn.jsdelivr.net/npm/@techstark/opencv-js/+esm?retry=2",
      "https://cdn.jsdelivr.net/npm/@techstark/opencv-js/+esm?retry=3",
    ]);
    vi.useRealTimers();
    await expect(enhanceTechnologyIcon("one.svg", 1, 1)).resolves.toContain(
      "data:image/png",
    );
    expect(loader).toHaveBeenCalledTimes(5);
  });

  it("times out an uninitialized runtime and retries an import rejection", async () => {
    const fake = fixture();
    const loader = vi.fn((url: string): Promise<unknown> => {
      if (url.endsWith("?retry=1"))
        return Promise.reject(new Error("network error"));
      if (url.endsWith("?retry=2"))
        return Promise.resolve({ default: fake.cv });
      return Promise.resolve({ default: {} });
    });
    const enhanceTechnologyIcon = createTechnologyIconEnhancer(loader);
    vi.useFakeTimers();
    const pending = enhanceTechnologyIcon("runtime.svg", 1, 1);
    await vi.advanceTimersByTimeAsync(13_000);
    vi.useRealTimers();
    await expect(pending).resolves.toContain("data:image/png");
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it("rejects invalid serialized output and retries it later", async () => {
    const fake = fixture();
    fake.serialize.mockReturnValueOnce("data:,");
    const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
    await expect(enhanceTechnologyIcon("canvas.svg", 1, 1)).resolves.toBe(
      "canvas.svg",
    );
    await expect(enhanceTechnologyIcon("canvas.svg", 1, 1)).resolves.toContain(
      "data:image/png",
    );
  });

  it("does not load OpenCV on the server", async () => {
    const loader = vi.fn(() => Promise.reject(new Error("should not load")));
    const enhanceTechnologyIcon = createTechnologyIconEnhancer(loader);
    vi.stubGlobal("window", undefined);
    await expect(enhanceTechnologyIcon("server.svg", 24, 24)).resolves.toBe(
      "server.svg",
    );
    expect(loader).not.toHaveBeenCalled();
  });
});

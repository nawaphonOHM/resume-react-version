import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTechnologyIconEnhancer,
  type TechnologyIconPresentation,
} from "./technology-icon-contrast";
import {
  fixture,
  serviceWith,
  type FixtureOptions,
} from "./technology-icon-contrast.test-fixtures";

function sourceOf(
  pending: Promise<TechnologyIconPresentation>,
): Promise<string> {
  return pending.then((presentation) => presentation.src);
}

function fallbackFor(src: string): TechnologyIconPresentation {
  return { src, background: "#ffffff" };
}

function expectAllAllocationsDisposed(
  allocations: ReturnType<typeof fixture>["allocations"],
) {
  expect(allocations.every((item) => item.delete.mock.calls.length === 1)).toBe(
    true,
  );
}

function expectImageLoads(
  images: { crossOrigin: string | null; decoding: string; src: string }[],
  sources: string[],
) {
  expect(images).toEqual(
    sources.map((src) => ({
      src,
      crossOrigin: "anonymous",
      decoding: "async",
    })),
  );
}

async function verifyCachedResults(
  enhance: ReturnType<typeof createTechnologyIconEnhancer>,
) {
  const first = enhance("icon.svg", 1, 1);
  expect(enhance("icon.svg", 1, 1)).toBe(first);
  await expect(sourceOf(first)).resolves.toBe(
    "data:image/png;base64,processed",
  );
  await Promise.all([
    enhance("icon.svg", 1, 1),
    enhance("icon.svg", 2, 1),
    enhance("other.svg", 1, 1),
  ]);
}

async function verifyStalledRuntimeRetry(
  enhance: ReturnType<typeof createTechnologyIconEnhancer>,
  loader: ((url: string) => Promise<unknown>) & { mock: { calls: [string][] } },
) {
  const first = enhance("one.svg", 1, 1);
  const second = enhance("two.svg", 1, 1);
  await vi.advanceTimersByTimeAsync(67_000);
  await expect(first).resolves.toEqual(fallbackFor("one.svg"));
  await expect(second).resolves.toEqual(fallbackFor("two.svg"));
  expect(loader.mock.calls.map(([url]) => url)).toEqual([
    "https://cdn.jsdelivr.net/npm/@techstark/opencv-js/+esm",
    "https://cdn.jsdelivr.net/npm/@techstark/opencv-js/+esm?retry=1",
    "https://cdn.jsdelivr.net/npm/@techstark/opencv-js/+esm?retry=2",
    "https://cdn.jsdelivr.net/npm/@techstark/opencv-js/+esm?retry=3",
  ]);
  vi.useRealTimers();
  await expect(sourceOf(enhance("one.svg", 1, 1))).resolves.toContain(
    "data:image/png",
  );
  expect(loader).toHaveBeenCalledTimes(5);
}

async function completeRuntimeInitialization({
  pending,
  initializing,
  runtime,
  previous,
}: {
  pending: Promise<TechnologyIconPresentation>;
  initializing: { onRuntimeInitialized?: () => void };
  runtime: object;
  previous: () => void;
}) {
  await vi.waitFor(() => {
    expect(initializing.onRuntimeInitialized).not.toBe(previous);
  });
  Object.assign(initializing, runtime);
  initializing.onRuntimeInitialized?.();
  await expect(sourceOf(pending)).resolves.toContain("data:image/png");
  expect(previous).toHaveBeenCalledOnce();
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("enhanceTechnologyIcon", () => {
  describe("image processing", () => {
    it("shares in-flight and successful results, while distinguishing dimensions and sources", async () => {
      const fake = fixture();
      const loader = vi.fn(() => fake.cv);
      const { enhanceTechnologyIcon } = serviceWith(loader);
      await verifyCachedResults(enhanceTechnologyIcon);
      expect(loader).toHaveBeenCalledOnce();
      expectImageLoads(fake.images, ["icon.svg", "icon.svg", "other.svg"]);
      expectAllAllocationsDisposed(fake.allocations);
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
      const result = await enhanceTechnologyIcon("light.svg", 1, 1);
      expect(fake.written[0]).toEqual([134, 141, 150, 255]);
      expect(result).toEqual({
        src: "data:image/png;base64,processed",
        background: "#0d1b2d",
      });
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
      const result = await enhanceTechnologyIcon("transparent.svg", 1, 1);
      expect(fake.written[0]).toEqual([255, 255, 255, 255]);
      expect(result).toEqual({
        src: "data:image/png;base64,processed",
        background: "#ffffff",
      });
    });

    it("cleans up partial allocations and retries a processing failure", async () => {
      const options: FixtureOptions = { failClahe: true };
      const fake = fixture(options);
      const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
      await expect(enhanceTechnologyIcon("retry.svg", 1, 1)).resolves.toEqual(
        fallbackFor("retry.svg"),
      );
      expect(fake.allocations.length).toBeGreaterThan(0);
      expectAllAllocationsDisposed(fake.allocations);
      options.failClahe = false;
      await expect(
        sourceOf(enhanceTechnologyIcon("retry.svg", 1, 1)),
      ).resolves.toContain("data:image/png");
    });
  });

  describe("fallback behavior", () => {
    it("falls back for image and canvas errors and invalid dimensions", async () => {
      const options: FixtureOptions = { image: "error" };
      const fake = fixture(options);
      const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
      await expect(enhanceTechnologyIcon("icon.svg", 1, 1)).resolves.toEqual(
        fallbackFor("icon.svg"),
      );
      options.image = "load";
      options.failCanvas = true;
      await expect(enhanceTechnologyIcon("icon.svg", 1, 1)).resolves.toEqual(
        fallbackFor("icon.svg"),
      );
      await expect(enhanceTechnologyIcon("icon.svg", 0, 1)).resolves.toEqual(
        fallbackFor("icon.svg"),
      );
      options.failCanvas = false;
      await expect(
        sourceOf(enhanceTechnologyIcon("icon.svg", 1, 1)),
      ).resolves.toContain("data:image/png");
    });

    it("bounds image loading and allows a later retry", async () => {
      const options: FixtureOptions = { image: "hang" };
      const fake = fixture(options);
      const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
      vi.useFakeTimers();
      const pending = enhanceTechnologyIcon("slow.svg", 1, 1);
      await vi.advanceTimersByTimeAsync(10_000);
      await expect(pending).resolves.toEqual(fallbackFor("slow.svg"));
      options.image = "load";
      vi.useRealTimers();
      await expect(
        sourceOf(enhanceTechnologyIcon("slow.svg", 1, 1)),
      ).resolves.toContain("data:image/png");
    });

    it("rejects invalid serialized output and retries it later", async () => {
      const fake = fixture();
      fake.serialize.mockReturnValueOnce("data:,");
      const { enhanceTechnologyIcon } = serviceWith(() => fake.cv);
      await expect(enhanceTechnologyIcon("canvas.svg", 1, 1)).resolves.toEqual(
        fallbackFor("canvas.svg"),
      );
      await expect(
        sourceOf(enhanceTechnologyIcon("canvas.svg", 1, 1)),
      ).resolves.toContain("data:image/png");
    });

    it("does not load OpenCV on the server", async () => {
      const loader = vi.fn(() => Promise.reject(new Error("should not load")));
      const enhanceTechnologyIcon = createTechnologyIconEnhancer(loader);
      vi.stubGlobal("window", undefined);
      await expect(
        enhanceTechnologyIcon("server.svg", 24, 24),
      ).resolves.toEqual(fallbackFor("server.svg"));
      expect(loader).not.toHaveBeenCalled();
    });
  });

  describe("runtime loading", () => {
    it("unwraps nested asynchronous exports and waits for runtime initialization", async () => {
      const fake = fixture();
      const previous = vi.fn();
      const initializing: { onRuntimeInitialized?: () => void } = {
        onRuntimeInitialized: previous,
      };
      const loader = vi.fn(() =>
        Promise.resolve({
          default: Promise.resolve({ default: initializing }),
        }),
      );
      const enhanceTechnologyIcon = createTechnologyIconEnhancer(loader);
      const pending = enhanceTechnologyIcon("initializing.svg", 1, 1);
      await completeRuntimeInitialization({
        pending,
        initializing,
        runtime: fake.cv,
        previous,
      });
    });

    it("bounds and shares stalled runtime attempts, then retries after failure", async () => {
      const fake = fixture();
      const loader = vi.fn((url: string): Promise<unknown> => {
        if (!url.endsWith("?retry=4")) return new Promise(() => {});
        return Promise.resolve({ default: fake.cv });
      });
      const enhanceTechnologyIcon = createTechnologyIconEnhancer(loader);
      vi.useFakeTimers();
      await verifyStalledRuntimeRetry(enhanceTechnologyIcon, loader);
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
      await vi.advanceTimersByTimeAsync(18_000);
      vi.useRealTimers();
      await expect(sourceOf(pending)).resolves.toContain("data:image/png");
      expect(loader).toHaveBeenCalledTimes(3);
    });
  });
});

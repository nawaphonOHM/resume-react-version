import { expect, vi } from "vitest";
import { createTechnologyIconEnhancer } from "./technology-icon-contrast";

export interface FixtureOptions {
  pixels?: number[];
  enhanced?: number[][];
  image?: "load" | "error" | "hang";
  failClahe?: boolean;
  failCanvas?: boolean;
}

interface FixtureState {
  allocations: { delete: ReturnType<typeof vi.fn> }[];
  grids: number[][];
  written: number[][];
  images: { crossOrigin: string | null; decoding: string; src: string }[];
  surface: number;
  width: number;
  height: number;
}

function createMatClass(allocations: FixtureState["allocations"]) {
  return class FakeMat {
    data = new Uint8Array();
    delete = vi.fn();
    constructor() {
      allocations.push(this);
    }
  };
}

function createMatVectorClass(
  allocations: FixtureState["allocations"],
  Mat: ReturnType<typeof createMatClass>,
) {
  return class FakeMatVector {
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
  };
}

function createSizeClass(state: FixtureState) {
  return class FakeSize {
    delete = vi.fn();
    constructor(width: number, height: number) {
      state.allocations.push(this);
      state.grids.push([width, height]);
    }
  };
}

function createClaheClass(
  options: FixtureOptions,
  allocations: FixtureState["allocations"],
) {
  return class FakeClahe {
    delete = vi.fn();
    collectGarbage = vi.fn();
    constructor(clip: number) {
      expect(clip).toBe(2);
      allocations.push(this);
    }
    apply() {
      if (options.failClahe) throw new Error("CLAHE failed");
    }
  };
}

function createOpenCv(options: FixtureOptions, state: FixtureState) {
  const Mat = createMatClass(state.allocations);
  const MatVector = createMatVectorClass(state.allocations, Mat);
  const Size = createSizeClass(state);
  const CLAHE = createClaheClass(options, state.allocations);
  return {
    Mat,
    MatVector,
    Size,
    CLAHE,
    COLOR_RGBA2RGB: 1,
    COLOR_RGB2Lab: 2,
    COLOR_Lab2RGB: 3,
    matFromImageData: vi.fn((data: ImageData) => {
      state.width = data.width;
      state.height = data.height;
      return new Mat();
    }),
    cvtColor: vi.fn(
      (
        _source: InstanceType<typeof Mat>,
        destination: InstanceType<typeof Mat>,
        code: number,
      ) => {
        if (code === 3) {
          const color = options.enhanced?.[state.surface++] ?? [0, 0, 0];
          destination.data = Uint8Array.from(
            Array.from(
              { length: state.width * state.height },
              () => color,
            ).flat(),
          );
        }
      },
    ),
    split: vi.fn(),
    merge: vi.fn(),
  };
}

function createFakeImageClass(
  options: FixtureOptions,
  images: FixtureState["images"],
) {
  return class FakeImage {
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
  };
}

function createCanvasContext(
  canvas: HTMLCanvasElement,
  options: FixtureOptions,
  state: FixtureState,
): CanvasRenderingContext2D {
  const pixels = options.pixels ?? [0, 0, 0, 255];
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
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: (data: ImageData) => {
      state.written.push(Array.from(data.data));
    },
  } as unknown as CanvasRenderingContext2D;
}

function mockCanvasContext(options: FixtureOptions, state: FixtureState) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function getContext(this: HTMLCanvasElement) {
      return createCanvasContext(this, options, state);
    },
  );
}

export function fixture(options: FixtureOptions = {}) {
  const state: FixtureState = {
    allocations: [],
    grids: [],
    written: [],
    images: [],
    surface: 0,
    width: 0,
    height: 0,
  };
  vi.stubGlobal("Image", createFakeImageClass(options, state.images));
  mockCanvasContext(options, state);
  const cv = createOpenCv(options, state);
  const serialize = vi
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockReturnValue("data:image/png;base64,processed");
  return { cv, ...state, serialize };
}

export function serviceWith(loader: () => unknown) {
  return {
    enhanceTechnologyIcon: createTechnologyIconEnhancer(() =>
      Promise.resolve({ default: loader() }),
    ),
  };
}

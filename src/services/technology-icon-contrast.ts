import { selectBestCandidate } from "./technology-icon-contrast-processing";

const OPEN_CV_URL = "https://cdn.jsdelivr.net/npm/@techstark/opencv-js/+esm";
const LOAD_TIMEOUT_MS = 10_000;
const IMAGE_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1_000;
const MAX_ATTEMPTS = 4;

export interface Disposable {
  delete?: () => void;
}

export interface Mat extends Disposable {
  data: Uint8Array;
}

export interface MatVector extends Disposable {
  get(index: number): Mat;
  push_back(mat: Mat): void;
}

export interface Clahe extends Disposable {
  apply(source: Mat, destination: Mat): void;
  collectGarbage?(): void;
}

export interface OpenCv {
  Mat: new () => Mat;
  MatVector: new () => MatVector;
  Size: new (width: number, height: number) => Disposable;
  CLAHE: new (clipLimit: number, size: Disposable) => Clahe;
  COLOR_RGBA2RGB: number;
  COLOR_RGB2Lab: number;
  COLOR_Lab2RGB: number;
  matFromImageData(data: ImageData): Mat;
  cvtColor(source: Mat, destination: Mat, code: number): void;
  split(source: Mat, destination: MatVector): void;
  merge(source: MatVector, destination: Mat): void;
}

type InitializingRuntime = {
  Mat?: unknown;
  default?: unknown;
  onRuntimeInitialized?: () => void;
};

function withTimeout<T>(promise: Promise<T>, delay: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Operation timed out"));
    }, delay);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("Operation failed"));
      },
    );
  });
}

function isObject(value: unknown): value is InitializingRuntime {
  return (
    (typeof value === "object" && value !== null) || typeof value === "function"
  );
}

type RuntimeResolution =
  | { kind: "ready"; runtime: OpenCv }
  | { kind: "nested"; value: unknown }
  | { kind: "initializing"; runtime: Promise<OpenCv> };

function resolveRuntimeCandidate(candidate: unknown): RuntimeResolution {
  if (!isObject(candidate)) throw new Error("Invalid OpenCV module");
  if (typeof candidate.Mat === "function") {
    return { kind: "ready", runtime: candidate as OpenCv };
  }
  if ("default" in candidate && candidate.default !== candidate) {
    return { kind: "nested", value: candidate.default };
  }
  if ("then" in candidate && typeof candidate.then === "function") {
    return { kind: "nested", value: Promise.resolve(candidate) };
  }
  return { kind: "initializing", runtime: waitForInitialization(candidate) };
}

async function normalizeRuntime(value: unknown): Promise<OpenCv> {
  let candidate = value;
  for (let depth = 0; depth < 8; depth++) {
    const resolution = resolveRuntimeCandidate(candidate);
    if (resolution.kind === "ready") return resolution.runtime;
    if (resolution.kind === "initializing") return resolution.runtime;
    candidate = await resolution.value;
  }
  throw new Error("Invalid OpenCV module nesting");
}

function waitForInitialization(
  candidate: InitializingRuntime,
): Promise<OpenCv> {
  return new Promise((resolve, reject) => {
    const previous = candidate.onRuntimeInitialized;
    candidate.onRuntimeInitialized = () => {
      try {
        previous?.();
        if (typeof candidate.Mat !== "function")
          throw new Error("OpenCV is not initialized");
        resolve(candidate as OpenCv);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("OpenCV initialization failed"),
        );
      }
    };
  });
}

type ModuleLoader = (url: string) => Promise<unknown>;

async function loadRuntime(
  loader: ModuleLoader,
  nextSequence: () => number,
): Promise<OpenCv> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0)
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * 2 ** (attempt - 1)),
      );
    const sequence = nextSequence();
    const url =
      sequence === 0 ? OPEN_CV_URL : `${OPEN_CV_URL}?retry=${String(sequence)}`;
    try {
      return await withTimeout(
        loader(url).then(normalizeRuntime),
        LOAD_TIMEOUT_MS,
      );
    } catch (error) {
      if (attempt === MAX_ATTEMPTS - 1) throw error;
    }
  }
  throw new Error("OpenCV unavailable");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  image.crossOrigin = "anonymous";
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      finish(new Error("Image load timed out"));
    }, IMAGE_TIMEOUT_MS);
    function finish(error?: Error) {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve(image);
    }
    image.onload = () => {
      finish();
    };
    image.onerror = () => {
      finish(new Error("Image load failed"));
    };
    try {
      image.src = src;
    } catch {
      finish(new Error("Image load failed"));
    }
  });
}

interface EnhancementRequest {
  src: string;
  width: number;
  height: number;
  getRuntime: () => Promise<OpenCv>;
}

function createEnhancementCanvas(
  image: HTMLImageElement,
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(image, 0, 0, width, height);
  return { canvas, context };
}

function readSourcePixels(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): Uint8ClampedArray {
  const source = context.getImageData(0, 0, width, height).data;
  if (source.length !== width * height * 4) {
    throw new Error("Invalid image pixels");
  }
  return source;
}

function writeCanvasResult(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  candidate: { pixels: Uint8ClampedArray; surface: "light" | "dark" },
): string {
  const imageData = context.createImageData(
    context.canvas.width,
    context.canvas.height,
  );
  imageData.data.set(candidate.pixels);
  context.putImageData(imageData, 0, 0);
  const result = canvas.toDataURL("image/png");
  if (!result.startsWith("data:image/png")) {
    throw new Error("Invalid canvas output");
  }
  return result;
}

async function enhance({
  src,
  width,
  height,
  getRuntime,
}: EnhancementRequest): Promise<{ src: string; surface: "light" | "dark" }> {
  const cv = await getRuntime();
  const image = await loadImage(src);
  const { canvas, context } = createEnhancementCanvas(image, width, height);
  const source = readSourcePixels(context, width, height);
  const candidate = selectBestCandidate(cv, context, source);
  return {
    src: writeCanvasResult(canvas, context, candidate),
    surface: candidate.surface,
  };
}

function hasBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function hasValidDimensions(width: number, height: number): boolean {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0
  );
}

export function createTechnologyIconEnhancer(loader: ModuleLoader) {
  const results = new Map<string, Promise<string>>();
  const surfaces = new Map<string, "light" | "dark">();
  let runtime: Promise<OpenCv> | undefined;
  let sequence = 0;
  const getRuntime = () => {
    if (!runtime) {
      runtime = loadRuntime(loader, () => sequence++).catch(
        (error: unknown) => {
          runtime = undefined;
          throw error;
        },
      );
    }
    return runtime;
  };

  function enhanceTechnologyIcon(
    src: string,
    width: number,
    height: number,
  ): Promise<string> {
    if (!hasBrowserEnvironment() || !hasValidDimensions(width, height)) {
      return Promise.resolve(src);
    }
    const key = JSON.stringify([src, width, height]);
    const cached = results.get(key);
    if (cached) return cached;
    const pending = enhance({ src, width, height, getRuntime })
      .then((result) => {
        surfaces.set(key, result.surface);
        return result.src;
      })
      .catch(() => {
        results.delete(key);
        surfaces.delete(key);
        return src;
      });
    results.set(key, pending);
    return pending;
  }
  return Object.assign(enhanceTechnologyIcon, {
    surfaceFor: (src: string, width: number, height: number) =>
      surfaces.get(JSON.stringify([src, width, height])),
  });
}

export const enhanceTechnologyIcon = createTechnologyIconEnhancer(
  (url) => import(/* @vite-ignore */ url),
);

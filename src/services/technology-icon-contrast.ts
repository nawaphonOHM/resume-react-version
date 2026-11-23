const OPEN_CV_URL = "https://cdn.jsdelivr.net/npm/@techstark/opencv-js/+esm";
const LOAD_TIMEOUT_MS = 10_000;
const IMAGE_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1_000;
const MAX_ATTEMPTS = 4;

interface Disposable {
  delete?: () => void;
}

interface Mat extends Disposable {
  data: Uint8Array;
}

interface MatVector extends Disposable {
  get(index: number): Mat;
  push_back(mat: Mat): void;
}

interface Clahe extends Disposable {
  apply(source: Mat, destination: Mat): void;
  collectGarbage?(): void;
}

interface OpenCv {
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

type Color = readonly [number, number, number];
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

// eslint-disable-next-line complexity
async function normalizeRuntime(value: unknown): Promise<OpenCv> {
  let candidate = value;
  for (let depth = 0; depth < 8; depth++) {
    if (!isObject(candidate)) throw new Error("Invalid OpenCV module");
    if (typeof candidate.Mat === "function") return candidate as OpenCv;
    if ("default" in candidate && candidate.default !== candidate) {
      candidate = candidate.default;
    } else if ("then" in candidate && typeof candidate.then === "function") {
      candidate = await Promise.resolve(candidate);
    } else {
      return waitForInitialization(candidate);
    }
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

// eslint-disable-next-line max-params
function blend(
  rgb: Uint8Array | Uint8ClampedArray,
  source: Uint8ClampedArray,
  background: Color,
  channels: number,
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(source.length);
  for (let pixel = 0; pixel < source.length / 4; pixel++) {
    const alpha = source[pixel * 4 + 3] / 255;
    for (let channel = 0; channel < 3; channel++) {
      result[pixel * 4 + channel] = Math.round(
        rgb[pixel * channels + channel] * alpha +
          background[channel] * (1 - alpha),
      );
    }
    result[pixel * 4 + 3] = 255;
  }
  return result;
}

function luminance(r: number, g: number, b: number): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function score(
  pixels: Uint8ClampedArray,
  source: Uint8ClampedArray,
  background: Color,
): number {
  const bg = luminance(...background);
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = source[i + 3] / 255;
    if (alpha === 0) continue;
    const fg = luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
    weighted += ((Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05)) * alpha;
    total += alpha;
  }
  return total === 0 ? 1 : weighted / total;
}

// eslint-disable-next-line max-statements, complexity
function applyClahe(
  cv: OpenCv,
  context: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
): Uint8Array {
  const allocations: Disposable[] = [];
  const track = <T extends Disposable>(item: T): T => {
    allocations.push(item);
    return item;
  };
  let clahe: Clahe | undefined;
  try {
    const { width, height } = context.canvas;
    const image = context.createImageData(width, height);
    image.data.set(pixels);
    const rgba = track(cv.matFromImageData(image));
    const rgb = track(new cv.Mat());
    const lab = track(new cv.Mat());
    cv.cvtColor(rgba, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
    const channels = track(new cv.MatVector());
    cv.split(lab, channels);
    const l = track(channels.get(0));
    const a = track(channels.get(1));
    const b = track(channels.get(2));
    const enhanced = track(new cv.Mat());
    const tiles = (dimension: number) =>
      Math.max(2, Math.min(8, Math.ceil(dimension / 16)));
    const grid = track(new cv.Size(tiles(width), tiles(height)));
    clahe = track(new cv.CLAHE(2, grid));
    clahe.apply(l, enhanced);
    const merged = track(new cv.MatVector());
    merged.push_back(enhanced);
    merged.push_back(a);
    merged.push_back(b);
    const enhancedLab = track(new cv.Mat());
    cv.merge(merged, enhancedLab);
    const enhancedRgb = track(new cv.Mat());
    cv.cvtColor(enhancedLab, enhancedRgb, cv.COLOR_Lab2RGB);
    const result = Uint8Array.from(enhancedRgb.data);
    if (result.length !== width * height * 3)
      throw new Error("Invalid OpenCV pixels");
    return result;
  } finally {
    try {
      clahe?.collectGarbage?.();
    } catch {
      /* Continue cleanup. */
    }
    for (const item of allocations.reverse()) {
      try {
        item.delete?.();
      } catch {
        /* Continue cleanup. */
      }
    }
  }
}

// eslint-disable-next-line max-params
function evaluateCandidate(
  cv: OpenCv,
  context: CanvasRenderingContext2D,
  source: Uint8ClampedArray,
  background: Color,
) {
  const original = blend(source, source, background, 4);
  const enhanced = blend(
    applyClahe(cv, context, original),
    source,
    background,
    3,
  );
  const originalScore = score(original, source, background);
  const enhancedScore = score(enhanced, source, background);
  return enhancedScore > originalScore
    ? { pixels: enhanced, score: enhancedScore }
    : { pixels: original, score: originalScore };
}

// eslint-disable-next-line max-params, max-statements
async function enhance(
  src: string,
  width: number,
  height: number,
  getRuntime: () => Promise<OpenCv>,
): Promise<{ src: string; surface: "light" | "dark" }> {
  const cv = await getRuntime();
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(image, 0, 0, width, height);
  const source = context.getImageData(0, 0, width, height).data;
  if (source.length !== width * height * 4)
    throw new Error("Invalid image pixels");
  const light = evaluateCandidate(cv, context, source, [255, 255, 255]);
  const dark = evaluateCandidate(cv, context, source, [13, 27, 45]);
  const imageData = context.createImageData(width, height);
  const surface = dark.score > light.score ? "dark" : "light";
  imageData.data.set(surface === "dark" ? dark.pixels : light.pixels);
  context.putImageData(imageData, 0, 0);
  const result = canvas.toDataURL("image/png");
  if (!result.startsWith("data:image/png"))
    throw new Error("Invalid canvas output");
  return { src: result, surface };
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
  // eslint-disable-next-line complexity
  function enhanceTechnologyIcon(
    src: string,
    width: number,
    height: number,
  ): Promise<string> {
    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return Promise.resolve(src);
    }
    const key = JSON.stringify([src, width, height]);
    const cached = results.get(key);
    if (cached) return cached;
    const pending = enhance(src, width, height, getRuntime)
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

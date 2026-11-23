import type {
  Clahe,
  Disposable,
  Mat,
  OpenCv,
} from "./technology-icon-contrast";

type Color = readonly [number, number, number];

interface BlendInput {
  rgb: Uint8Array | Uint8ClampedArray;
  source: Uint8ClampedArray;
  background: Color;
  channels: number;
}

function blend({
  rgb,
  source,
  background,
  channels,
}: BlendInput): Uint8ClampedArray {
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

function safelyCollectGarbage(clahe?: Clahe): void {
  try {
    clahe?.collectGarbage?.();
  } catch {
    /* Continue cleanup. */
  }
}

function safelyDelete(item: Disposable): void {
  try {
    item.delete?.();
  } catch {
    /* Continue cleanup. */
  }
}

class OpenCvAllocationTracker {
  private readonly allocations: Disposable[] = [];
  private clahe?: Clahe;

  track<T extends Disposable>(item: T): T {
    this.allocations.push(item);
    return item;
  }

  trackClahe(clahe: Clahe): Clahe {
    this.clahe = clahe;
    return this.track(clahe);
  }

  dispose(): void {
    safelyCollectGarbage(this.clahe);
    this.allocations.reverse().forEach(safelyDelete);
  }
}

interface LabChannels {
  lightness: Mat;
  a: Mat;
  b: Mat;
}

interface LabProcessingContext {
  cv: OpenCv;
  context: CanvasRenderingContext2D;
  allocations: OpenCvAllocationTracker;
}

function createLabImage(
  context: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
): ImageData {
  const image = context.createImageData(
    context.canvas.width,
    context.canvas.height,
  );
  image.data.set(pixels);
  return image;
}

function createLabMat(
  cv: OpenCv,
  image: ImageData,
  allocations: OpenCvAllocationTracker,
): Mat {
  const rgba = allocations.track(cv.matFromImageData(image));
  const rgb = allocations.track(new cv.Mat());
  const lab = allocations.track(new cv.Mat());
  cv.cvtColor(rgba, rgb, cv.COLOR_RGBA2RGB);
  cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
  return lab;
}

function splitLabChannels(
  cv: OpenCv,
  lab: Mat,
  allocations: OpenCvAllocationTracker,
): LabChannels {
  const channels = allocations.track(new cv.MatVector());
  cv.split(lab, channels);
  return {
    lightness: allocations.track(channels.get(0)),
    a: allocations.track(channels.get(1)),
    b: allocations.track(channels.get(2)),
  };
}

function createLabChannels(
  { cv, context, allocations }: LabProcessingContext,
  pixels: Uint8ClampedArray,
): LabChannels {
  const image = createLabImage(context, pixels);
  const lab = createLabMat(cv, image, allocations);
  return splitLabChannels(cv, lab, allocations);
}

function tileCount(dimension: number): number {
  return Math.max(2, Math.min(8, Math.ceil(dimension / 16)));
}

function createClahe({
  cv,
  width,
  height,
  allocations,
}: {
  cv: OpenCv;
  width: number;
  height: number;
  allocations: OpenCvAllocationTracker;
}): Clahe {
  const grid = allocations.track(
    new cv.Size(tileCount(width), tileCount(height)),
  );
  return allocations.trackClahe(new cv.CLAHE(2, grid));
}

function mergeEnhancedChannels({
  cv,
  channels,
  enhanced,
  allocations,
}: {
  cv: OpenCv;
  channels: LabChannels;
  enhanced: Mat;
  allocations: OpenCvAllocationTracker;
}): Mat {
  const merged = allocations.track(new cv.MatVector());
  merged.push_back(enhanced);
  merged.push_back(channels.a);
  merged.push_back(channels.b);
  const enhancedLab = allocations.track(new cv.Mat());
  cv.merge(merged, enhancedLab);
  return enhancedLab;
}

function convertEnhancedToRgb(
  cv: OpenCv,
  enhancedLab: Mat,
  allocations: OpenCvAllocationTracker,
): Uint8Array {
  const enhancedRgb = allocations.track(new cv.Mat());
  cv.cvtColor(enhancedLab, enhancedRgb, cv.COLOR_Lab2RGB);
  return Uint8Array.from(enhancedRgb.data);
}

function enhanceLabPixels({
  cv,
  context,
  pixels,
  allocations,
}: LabProcessingContext & { pixels: Uint8ClampedArray }): Uint8Array {
  const { width, height } = context.canvas;
  const channels = createLabChannels({ cv, context, allocations }, pixels);
  const enhanced = allocations.track(new cv.Mat());
  const clahe = createClahe({ cv, width, height, allocations });
  clahe.apply(channels.lightness, enhanced);
  const enhancedLab = mergeEnhancedChannels({
    cv,
    channels,
    enhanced,
    allocations,
  });
  const result = convertEnhancedToRgb(cv, enhancedLab, allocations);
  if (result.length !== width * height * 3) {
    throw new Error("Invalid OpenCV pixels");
  }
  return result;
}

function applyClahe(
  cv: OpenCv,
  context: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
): Uint8Array {
  const allocations = new OpenCvAllocationTracker();
  try {
    return enhanceLabPixels({ cv, context, pixels, allocations });
  } finally {
    allocations.dispose();
  }
}

interface CandidateInput {
  cv: OpenCv;
  context: CanvasRenderingContext2D;
  source: Uint8ClampedArray;
}

function evaluateCandidate(
  { cv, context, source }: CandidateInput,
  background: Color,
) {
  const original = blend({ rgb: source, source, background, channels: 4 });
  const enhanced = blend({
    rgb: applyClahe(cv, context, original),
    source,
    background,
    channels: 3,
  });
  const originalScore = score(original, source, background);
  const enhancedScore = score(enhanced, source, background);
  return enhancedScore > originalScore
    ? { pixels: enhanced, score: enhancedScore }
    : { pixels: original, score: originalScore };
}

export function selectBestCandidate(
  cv: OpenCv,
  context: CanvasRenderingContext2D,
  source: Uint8ClampedArray,
): { pixels: Uint8ClampedArray; surface: "light" | "dark" } {
  const input = { cv, context, source };
  const light = evaluateCandidate(input, [255, 255, 255]);
  const dark = evaluateCandidate(input, [13, 27, 45]);
  return dark.score > light.score
    ? { pixels: dark.pixels, surface: "dark" }
    : { pixels: light.pixels, surface: "light" };
}

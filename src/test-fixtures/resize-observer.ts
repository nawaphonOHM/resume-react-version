import { vi } from "vitest";

export class ResizeObserverTestDouble implements ResizeObserver {
  static instances: ResizeObserverTestDouble[] = [];

  readonly observed: Element[] = [];
  readonly disconnect = vi.fn();
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverTestDouble.instances.push(this);
  }

  static observing(target: Element): ResizeObserverTestDouble {
    const observer = this.instances.findLast((candidate) =>
      candidate.observed.includes(target),
    );
    if (!observer) throw new Error("Element is not observed for resizing");
    return observer;
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  unobserve(): void {}

  notifyWidth(target: Element, width: number): void {
    const entry = { target, contentRect: new DOMRect(0, 0, width, 0) };
    this.callback([entry as ResizeObserverEntry], this);
  }
}

export function installResizeObserverTestDouble(): void {
  ResizeObserverTestDouble.instances = [];
  vi.stubGlobal("ResizeObserver", ResizeObserverTestDouble);
}

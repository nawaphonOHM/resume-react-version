import { vi } from "vitest";

class TestIntersectionObserver implements IntersectionObserver {
  static instances: TestIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin: string;
  readonly scrollMargin = "0px";
  readonly thresholds: readonly number[];
  readonly observedTargets: Element[] = [];
  readonly callback: IntersectionObserverCallback;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.rootMargin = options?.rootMargin ?? "0px";
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold ?? 0];
    TestIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observedTargets.push(target);
  }

  unobserve(target: Element): void {
    const index = this.observedTargets.indexOf(target);
    if (index >= 0) {
      this.observedTargets.splice(index, 1);
    }
  }

  disconnect(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  intersect(target: Element): void {
    const entry = {
      target,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: 0,
    } satisfies IntersectionObserverEntry;
    this.callback([entry], this);
  }
}

export function installIntersectionObserverMock(): void {
  TestIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
}

export function observerFor(target: Element): TestIntersectionObserver {
  const observer = TestIntersectionObserver.instances.find((instance) =>
    instance.observedTargets.includes(target),
  );
  if (!observer) {
    throw new Error("No intersection observer is watching the section");
  }
  return observer;
}

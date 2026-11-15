import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useActiveSection } from "./use-active-section";

class TestIntersectionObserver implements IntersectionObserver {
  static instances: TestIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin: string;
  readonly scrollMargin = "0px";
  readonly thresholds: readonly number[];
  readonly observedTargets: Element[] = [];
  readonly unobservedTargets: Element[] = [];
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
    this.unobservedTargets.push(target);
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("useActiveSection", () => {
  it("initializes from the current section fragment", () => {
    window.history.replaceState(null, "", "/#skills");

    const { result } = renderHook(() => useActiveSection());

    expect(result.current.activeSection).toBe("skills");
  });

  it("updates the active section when the URL fragment changes", () => {
    const { result } = renderHook(() => useActiveSection());

    act(() => {
      window.location.hash = "#experience";
      window.dispatchEvent(new Event("hashchange"));
    });

    expect(result.current.activeSection).toBe("experience");
  });

  // eslint-disable-next-line max-statements
  it("observes sections inserted later and ignores replaced section entries", async () => {
    TestIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);

    const { result } = renderHook(() => useActiveSection());
    const observer = TestIntersectionObserver.instances[0];

    const placeholder = document.createElement("section");
    placeholder.id = "experience";
    placeholder.setAttribute("data-resume-section", "");
    document.body.append(placeholder);

    await waitFor(() => {
      expect(observer.observedTargets).toContain(placeholder);
    });

    act(() => {
      observer.intersect(placeholder);
    });
    expect(result.current.activeSection).toBe("experience");

    const replacement = document.createElement("section");
    replacement.id = "experience";
    replacement.setAttribute("data-resume-section", "");
    placeholder.replaceWith(replacement);

    await waitFor(() => {
      expect(observer.unobservedTargets).toContain(placeholder);
      expect(observer.observedTargets).toContain(replacement);
    });

    act(() => {
      window.location.hash = "#summary";
      window.dispatchEvent(new Event("hashchange"));
      observer.intersect(placeholder);
    });
    expect(result.current.activeSection).toBe("summary");

    act(() => {
      observer.intersect(replacement);
    });
    expect(result.current.activeSection).toBe("experience");

    replacement.remove();
  });
});

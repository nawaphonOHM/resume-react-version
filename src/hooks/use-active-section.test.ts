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

function prepareTestObserver() {
  TestIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
}

function getTestObserver() {
  const observer = TestIntersectionObserver.instances.at(0);
  if (!observer) throw new Error("IntersectionObserver was not created");
  return observer;
}

async function appendObservedSection(
  observer: TestIntersectionObserver,
  id: string,
) {
  const section = document.createElement("section");
  section.id = id;
  section.setAttribute("data-resume-section", "");
  document.body.append(section);
  await waitFor(() => {
    expect(observer.observedTargets).toContain(section);
  });
  return section;
}

async function replaceObservedSection(
  observer: TestIntersectionObserver,
  section: HTMLElement,
) {
  const replacement = document.createElement("section");
  replacement.id = section.id;
  replacement.setAttribute("data-resume-section", "");
  section.replaceWith(replacement);
  await waitFor(() => {
    expect(observer.unobservedTargets).toContain(section);
    expect(observer.observedTargets).toContain(replacement);
  });
  return replacement;
}

function intersectSection(
  observer: TestIntersectionObserver,
  section: Element,
) {
  act(() => {
    observer.intersect(section);
  });
}

function verifyStaleEntryHandling({
  observer,
  placeholder,
  replacement,
  result,
}: {
  observer: TestIntersectionObserver;
  placeholder: Element;
  replacement: HTMLElement;
  result: { current: { activeSection: string } };
}) {
  act(() => {
    window.location.hash = "#summary";
    window.dispatchEvent(new Event("hashchange"));
    observer.intersect(placeholder);
  });
  expect(result.current.activeSection).toBe("summary");
  intersectSection(observer, replacement);
  expect(result.current.activeSection).toBe("experience");
  replacement.remove();
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

  it("observes sections inserted later and ignores replaced section entries", async () => {
    prepareTestObserver();
    const { result } = renderHook(() => useActiveSection());
    const observer = getTestObserver();
    const placeholder = await appendObservedSection(observer, "experience");
    intersectSection(observer, placeholder);
    expect(result.current.activeSection).toBe("experience");
    const replacement = await replaceObservedSection(observer, placeholder);
    verifyStaleEntryHandling({ observer, placeholder, replacement, result });
  });
});

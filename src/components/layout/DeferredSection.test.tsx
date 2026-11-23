import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeferredSection } from "./DeferredSection";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

function installScrollMock() {
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollIntoView",
  );
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });
  return {
    scrollIntoView,
    restore: () => {
      if (original) {
        Object.defineProperty(
          HTMLElement.prototype,
          "scrollIntoView",
          original,
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
    },
  };
}

describe("DeferredSection", () => {
  it("scrolls to the mounted fragment with the target as its receiver", () => {
    const { scrollIntoView, restore } = installScrollMock();
    vi.stubGlobal("IntersectionObserver", undefined);
    window.history.replaceState(null, "", "#summary");
    try {
      render(
        <DeferredSection sectionId="summary" title="Summary" renderAll={false}>
          <section id="summary">Summary content</section>
        </DeferredSection>,
      );
      expect(scrollIntoView).toHaveBeenCalledOnce();
      expect(scrollIntoView.mock.contexts[0]).toBe(
        document.getElementById("summary"),
      );
    } finally {
      restore();
    }
  });

  it("renders a fragment when scrolling is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    window.history.replaceState(null, "", "#summary");
    render(
      <DeferredSection sectionId="summary" title="Summary" renderAll={false}>
        <section id="summary">Summary content</section>
      </DeferredSection>,
    );
    expect(screen.getByText("Summary content")).not.toBeNull();
  });

  it("shows a retryable accessible error when section content fails", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
    let broken = true;

    function BrokenSection() {
      if (broken) {
        throw new Error("Section render failed");
      }
      return <p>Recovered section</p>;
    }

    render(
      <DeferredSection
        sectionId="summary"
        title="Professional summary"
        renderAll={false}
      >
        <BrokenSection />
      </DeferredSection>,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Unable to display Professional summary",
    );
    expect(
      screen.getByRole("button", { name: "Retry section" }),
    ).not.toBeNull();

    broken = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry section" }));

    expect(screen.getByText("Recovered section")).not.toBeNull();
  });
});

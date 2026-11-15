import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeferredSection } from "./DeferredSection";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DeferredSection", () => {
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

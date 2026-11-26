import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LoadingView } from "./LoadingView";

afterEach(() => {
  cleanup();
});

describe("LoadingView component", () => {
  it("announces loading with a labelled progress bar", () => {
    render(<LoadingView progress={50} />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.getAttribute("aria-live")).toBe("polite");

    const progressbar = screen.getByRole("progressbar", {
      name: "Loading resume data",
    });
    expect(progressbar.getAttribute("aria-valuenow")).toBe("50");
    expect(progressbar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressbar.getAttribute("aria-valuemax")).toBe("100");
    expect(progressbar.style.width).toBe("50%");
  });

  it("rounds fractional progress", () => {
    render(<LoadingView progress={12.5} />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("13");
    expect(progressbar.style.width).toBe("13%");
  });

  it("shows only the loading text", () => {
    const { container } = render(<LoadingView progress={100} />);

    expect(container.textContent).toBe("Loading resume data...");
    expect(container.querySelector("main")).toBeNull();
  });
});

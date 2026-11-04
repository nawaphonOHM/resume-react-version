import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingView } from "./LoadingView";

describe("LoadingView component", () => {
  it("renders progressbar with correct accessibility attributes", () => {
    const { container } = render(<LoadingView progress={50} />);

    const progressbar = container.querySelector('[role="progressbar"]');
    expect(progressbar).not.toBeNull();
    expect(progressbar?.getAttribute("aria-valuenow")).toBe("50");
    expect(progressbar?.getAttribute("aria-valuemin")).toBe("0");
    expect(progressbar?.getAttribute("aria-valuemax")).toBe("100");
    expect(progressbar?.getAttribute("aria-label")).toBe("Loading resume data");
  });

  it("rounds floating percentage values for display", () => {
    const { container } = render(<LoadingView progress={12.5} />);

    const progressbar = container.querySelector('[role="progressbar"]');
    expect(progressbar?.getAttribute("aria-valuenow")).toBe("13");
    expect(container.textContent).toContain("Loading resume data...");
    expect(container.textContent).toContain("13% completed");
  });

  it("renders 100% completed correctly", () => {
    const { container } = render(<LoadingView progress={100} />);

    const progressbar = container.querySelector('[role="progressbar"]');
    expect(progressbar?.getAttribute("aria-valuenow")).toBe("100");
    expect(container.textContent).toContain("100% completed");
  });
});

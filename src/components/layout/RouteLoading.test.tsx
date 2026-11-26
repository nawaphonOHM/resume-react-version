import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteLoading } from "./RouteLoading";

const LEAVE_MS = 300;

function advance(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("RouteLoading", () => {
  it("covers the page with a labelled loader while a route loads", () => {
    render(<RouteLoading loading />);

    const overlay = screen.getByRole("status", { name: "Loading page" });
    expect(overlay.className).toBe("route-loading-container");
    expect(overlay.getAttribute("aria-live")).toBe("polite");
    expect(
      overlay.querySelector('[data-test~="ring-loader-inline"]'),
    ).not.toBeNull();
  });

  it("renders nothing when no route has been loading", () => {
    const { container } = render(<RouteLoading loading={false} />);

    expect(container.childElementCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("fades out for 300 ms once the route has loaded", () => {
    const { container, rerender } = render(<RouteLoading loading />);

    rerender(<RouteLoading loading={false} />);
    const overlay = screen.getByRole("status", { name: "Loading page" });
    expect(overlay.classList.contains("route-loading-leave")).toBe(true);

    advance(LEAVE_MS - 1);
    expect(container.childElementCount).toBe(1);

    advance(1);
    expect(container.childElementCount).toBe(0);
  });

  it("cancels the fade when another route starts loading", () => {
    const { rerender } = render(<RouteLoading loading />);
    rerender(<RouteLoading loading={false} />);
    advance(LEAVE_MS / 2);

    rerender(<RouteLoading loading />);
    advance(LEAVE_MS);

    const overlay = screen.getByRole("status", { name: "Loading page" });
    expect(overlay.className).toBe("route-loading-container");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the fade timer on unmount", () => {
    const { rerender, unmount } = render(<RouteLoading loading />);
    rerender(<RouteLoading loading={false} />);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

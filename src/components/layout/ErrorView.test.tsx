import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorView } from "./ErrorView";

afterEach(() => {
  cleanup();
});

describe("ErrorView component", () => {
  it("renders the error panel with the default message and no icon", () => {
    const { container } = render(<ErrorView onRetry={vi.fn()} />);

    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("aria-live")).toBe("assertive");
    expect(
      screen.getByRole("heading", { level: 2, name: "Unable to load resume" }),
    ).not.toBeNull();
    expect(alert.textContent).toContain(
      "An error occurred while loading the resume data. Please try again.",
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("main")).toBeNull();
  });

  it("triggers onRetry callback when retry button is clicked", () => {
    const handleRetry = vi.fn();
    render(<ErrorView onRetry={handleRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("renders custom error message when provided", () => {
    const { container } = render(
      <ErrorView
        onRetry={vi.fn()}
        message="Custom network connection timeout."
      />,
    );

    expect(container.textContent).toContain(
      "Custom network connection timeout.",
    );
  });
});

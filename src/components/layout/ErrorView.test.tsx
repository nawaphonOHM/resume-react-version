import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorView } from "./ErrorView";

describe("ErrorView component", () => {
  it("renders error alert with default message", () => {
    const { container } = render(<ErrorView onRetry={vi.fn()} />);

    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).toContain("Unable to load resume");
    expect(container.textContent).toContain(
      "An error occurred while loading the resume data. Please try again.",
    );
  });

  it("triggers onRetry callback when retry button is clicked", () => {
    const handleRetry = vi.fn();
    const { container } = render(<ErrorView onRetry={handleRetry} />);

    const retryButton = container.querySelector("button");
    expect(retryButton?.textContent).toContain("Retry");
    if (retryButton) {
      fireEvent.click(retryButton);
    }
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

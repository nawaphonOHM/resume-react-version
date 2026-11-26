import "../../test-fixtures/match-media";
import {
  cleanup as unmountRendered,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DownloadConfirmDialog } from "./DownloadConfirmDialog";

const ESCAPE_KEY = { key: "Escape", code: "Escape", keyCode: 27, which: 27 };

function renderConfirmation(isOpen = true) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <DownloadConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
    />,
  );
  return { onClose, onConfirm };
}

describe("download confirmation dialog", () => {
  afterEach(unmountRendered);

  it("shows the reference title, text and actions", () => {
    renderConfirmation();

    const dialog = screen.getByRole("dialog", { name: "Confirm Download" });
    expect(dialog.textContent).toContain("Confirm Download");
    expect(dialog.textContent).toContain(
      "The file may be unavailable. Do you confirm to continue?",
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
  });

  it("reports the chosen action", () => {
    const { onClose, onConfirm } = renderConfirmation();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("stays open on Escape and on a backdrop press", () => {
    const { onClose, onConfirm } = renderConfirmation();
    const dialog = screen.getByRole("dialog", { name: "Confirm Download" });

    fireEvent.keyDown(dialog, ESCAPE_KEY);
    fireEvent.keyDown(document.body, ESCAPE_KEY);
    for (const backdrop of document.querySelectorAll("[role=presentation]")) {
      fireEvent.mouseDown(backdrop);
      fireEvent.click(backdrop);
    }

    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Confirm Download" })).toBe(
      dialog,
    );
  });

  it("renders nothing while closed", () => {
    renderConfirmation(false);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  });
});

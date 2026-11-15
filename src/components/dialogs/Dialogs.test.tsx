import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DownloadConfirmDialog } from "./DownloadConfirmDialog";
import { ImageZoomDialog } from "./ImageZoomDialog";

describe("dialogs", () => {
  // eslint-disable-next-line max-statements
  it("preserves image surface, traps focus, closes on Escape and restores focus", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn();
    const { rerender } = render(
      <ImageZoomDialog
        image={{ src: "/logo.svg", alt: "Logo", surface: "dark" }}
        onClose={onClose}
      />,
    );
    const close = screen.getByRole("button", { name: "Close logo preview" });
    expect(screen.getByAltText("Logo").classList.contains("bg-[#071a2e]")).toBe(
      true,
    );
    await waitFor(() => {
      expect(document.activeElement).toBe(close);
    });
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<ImageZoomDialog image={null} onClose={onClose} />);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  // eslint-disable-next-line max-statements
  it("cycles focus in the confirmation dialog and invokes its actions", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <DownloadConfirmDialog isOpen onClose={onClose} onConfirm={onConfirm} />,
    );
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Continue" });
    await waitFor(() => {
      expect(document.activeElement).toBe(confirm);
    });
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirm);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(cancel);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

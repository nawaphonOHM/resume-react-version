import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DownloadConfirmDialog } from "./DownloadConfirmDialog";
import { ImageZoomDialog } from "./ImageZoomDialog";

function createPreviewOrigin(bounds = new DOMRect(48, 48, 32, 16)) {
  const trigger = document.createElement("button");
  const sourceImage = document.createElement("img");
  Object.defineProperties(sourceImage, {
    naturalWidth: { configurable: true, value: 128 },
    naturalHeight: { configurable: true, value: 64 },
  });
  vi.spyOn(sourceImage, "getBoundingClientRect").mockReturnValue(bounds);
  trigger.append(sourceImage);
  document.body.append(trigger);
  return { trigger, sourceImage };
}

function renderPreview(
  sourceImage: HTMLImageElement,
  onClose: () => void,
  surface: "light" | "dark" = "light",
) {
  return render(
    <ImageZoomDialog
      image={{
        src: "/logo.svg",
        alt: "Logo",
        surface,
        width: 128,
        height: 64,
        origin: sourceImage,
        activation: "keyboard",
      }}
      onClose={onClose}
    />,
  );
}

function renderPreviewFixture({
  bounds,
  onClose = vi.fn(),
  surface,
}: {
  bounds?: DOMRect;
  onClose?: () => void;
  surface?: "light" | "dark";
} = {}) {
  const { trigger, sourceImage } = createPreviewOrigin(bounds);
  trigger.focus();
  const result = renderPreview(sourceImage, onClose, surface);
  return {
    trigger,
    preview: getPreview(),
    onClose,
    cleanup: () => {
      result.unmount();
      trigger.remove();
    },
  };
}

function getPreview() {
  const preview = document.querySelector<HTMLElement>(
    "[data-image-zoom-preview]",
  );
  if (!preview) throw new Error("Preview was not rendered");
  return preview;
}

function expectAnchoredPreview(preview: HTMLElement, trigger: HTMLElement) {
  expect(preview.getAttribute("aria-hidden")).toBe("true");
  expect(preview.style.position).toBe("fixed");
  expect(Number.parseFloat(preview.style.left)).toBeGreaterThan(0);
  expect(Number.parseFloat(preview.style.top)).toBeGreaterThan(0);
  expect(document.activeElement).toBe(trigger);
}

function captureViewportSize() {
  return {
    width: Object.getOwnPropertyDescriptor(window, "innerWidth"),
    height: Object.getOwnPropertyDescriptor(window, "innerHeight"),
  };
}

function setViewportSize(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

function restoreViewportSize(original: ReturnType<typeof captureViewportSize>) {
  if (original.width)
    Object.defineProperty(window, "innerWidth", original.width);
  if (original.height)
    Object.defineProperty(window, "innerHeight", original.height);
}

function expectConstrainedPreview(preview: HTMLElement) {
  expect(preview.style.getPropertyValue("--image-zoom-image-max-width")).toBe(
    "75px",
  );
  expect(preview.style.getPropertyValue("--image-zoom-image-max-height")).toBe(
    "56px",
  );
  expect(Number.parseFloat(preview.style.left)).toBeLessThanOrEqual(258);
  expect(Number.parseFloat(preview.style.top)).toBeLessThanOrEqual(182);
}

function expectVisualOnlyPreview(preview: HTMLElement) {
  expect(preview.classList.contains("image-zoom-preview--dark")).toBe(true);
  expect(preview.getAttribute("aria-hidden")).toBe("true");
}

async function verifyConfirmationFocusCycle() {
  const cancel = screen.getByRole("button", { name: "Cancel" });
  const confirm = screen.getByRole("button", { name: "Continue" });
  await waitFor(() => {
    expect(document.activeElement).toBe(confirm);
  });
  fireEvent.keyDown(window, { key: "Tab" });
  expect(document.activeElement).toBe(cancel);
  fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(confirm);
  return { cancel, confirm };
}

describe("dialogs", () => {
  it("anchors an image preview inside the viewport without stealing focus", () => {
    const originalViewport = captureViewportSize();
    const { trigger, preview, cleanup } = renderPreviewFixture({
      bounds: new DOMRect(960, 720, 32, 16),
      surface: "dark",
    });
    try {
      expectAnchoredPreview(preview, trigger);
      setViewportSize(375, 280);
      fireEvent(window, new Event("resize"));
      expectConstrainedPreview(preview);
    } finally {
      restoreViewportSize(originalViewport);
      cleanup();
    }
  });

  it("keeps preview visual-only and closes on Escape without moving focus", () => {
    const { trigger, preview, onClose, cleanup } = renderPreviewFixture({
      surface: "dark",
    });
    try {
      expectVisualOnlyPreview(preview);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(trigger);
    } finally {
      cleanup();
    }
  });

  it("closes and hides the preview when its source is disconnected", () => {
    const { trigger, preview, onClose, cleanup } = renderPreviewFixture();
    try {
      expect(preview.style.visibility).toBe("visible");
      trigger.remove();
      fireEvent(window, new Event("resize"));
      expect(onClose).toHaveBeenCalledOnce();
      expect(preview.style.visibility).toBe("hidden");
    } finally {
      cleanup();
    }
  });

  it("cycles focus in the confirmation dialog and invokes its actions", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <DownloadConfirmDialog isOpen onClose={onClose} onConfirm={onConfirm} />,
    );
    const { cancel, confirm } = await verifyConfirmationFocusCycle();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(cancel);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DownloadConfirmDialog } from "./DownloadConfirmDialog";
import { ImageZoomDialog } from "./ImageZoomDialog";

function createPreviewOrigin() {
  const trigger = document.createElement("button");
  const sourceImage = document.createElement("img");
  Object.defineProperties(sourceImage, {
    naturalWidth: { configurable: true, value: 128 },
    naturalHeight: { configurable: true, value: 64 },
  });
  vi.spyOn(sourceImage, "getBoundingClientRect").mockReturnValue(
    new DOMRect(48, 48, 32, 16),
  );
  trigger.append(sourceImage);
  document.body.append(trigger);
  return { trigger, sourceImage };
}

function renderPreview(sourceImage: HTMLImageElement, onClose: () => void) {
  return render(
    <ImageZoomDialog
      image={{
        src: "/logo.svg",
        alt: "Logo",
        width: 128,
        height: 64,
        origin: sourceImage,
        activation: "keyboard",
      }}
      onClose={onClose}
    />,
  );
}

describe("dialogs", () => {
  // eslint-disable-next-line max-statements, complexity
  it("anchors an image preview inside the viewport without stealing focus", () => {
    const trigger = document.createElement("button");
    const sourceImage = document.createElement("img");
    Object.defineProperties(sourceImage, {
      naturalWidth: { configurable: true, value: 128 },
      naturalHeight: { configurable: true, value: 64 },
    });
    vi.spyOn(sourceImage, "getBoundingClientRect").mockReturnValue(
      new DOMRect(960, 720, 32, 16),
    );
    trigger.append(sourceImage);
    document.body.append(trigger);
    trigger.focus();

    let unmount = () => {};
    try {
      const result = render(
        <ImageZoomDialog
          image={{
            src: "/logo.svg",
            alt: "Logo",
            surface: "dark",
            width: 128,
            height: 64,
            origin: sourceImage,
            activation: "keyboard",
          }}
          onClose={vi.fn()}
        />,
      );
      unmount = result.unmount;

      const preview = document.querySelector<HTMLElement>(
        "[data-image-zoom-preview]",
      );
      expect(preview).not.toBeNull();
      expect(preview?.getAttribute("aria-hidden")).toBe("true");
      expect(preview?.style.position).toBe("fixed");
      expect(Number.parseFloat(preview?.style.left ?? "0")).toBeGreaterThan(0);
      expect(Number.parseFloat(preview?.style.top ?? "0")).toBeGreaterThan(0);
      expect(document.activeElement).toBe(trigger);

      const originalWidth = Object.getOwnPropertyDescriptor(
        window,
        "innerWidth",
      );
      const originalHeight = Object.getOwnPropertyDescriptor(
        window,
        "innerHeight",
      );
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: 280,
      });
      fireEvent(window, new Event("resize"));

      expect(
        preview?.style.getPropertyValue("--image-zoom-image-max-width"),
      ).toBe("75px");
      expect(
        preview?.style.getPropertyValue("--image-zoom-image-max-height"),
      ).toBe("56px");
      expect(Number.parseFloat(preview?.style.left ?? "0")).toBeLessThanOrEqual(
        258,
      );
      expect(Number.parseFloat(preview?.style.top ?? "0")).toBeLessThanOrEqual(
        182,
      );

      if (originalWidth) {
        Object.defineProperty(window, "innerWidth", originalWidth);
      }
      if (originalHeight) {
        Object.defineProperty(window, "innerHeight", originalHeight);
      }
    } finally {
      unmount();
      trigger.remove();
    }
  });

  // eslint-disable-next-line max-statements
  it("keeps preview visual-only and closes on Escape without moving focus", () => {
    const trigger = document.createElement("button");
    const sourceImage = document.createElement("img");
    Object.defineProperties(sourceImage, {
      naturalWidth: { configurable: true, value: 128 },
      naturalHeight: { configurable: true, value: 64 },
    });
    vi.spyOn(sourceImage, "getBoundingClientRect").mockReturnValue(
      new DOMRect(48, 48, 32, 16),
    );
    trigger.append(sourceImage);
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    let unmount = () => {};
    try {
      const result = render(
        <ImageZoomDialog
          image={{
            src: "/logo.svg",
            alt: "Logo",
            surface: "dark",
            width: 128,
            height: 64,
            origin: sourceImage,
            activation: "keyboard",
          }}
          onClose={onClose}
        />,
      );
      unmount = result.unmount;
      const preview = document.querySelector<HTMLElement>(
        "[data-image-zoom-preview]",
      );
      expect(preview?.classList.contains("image-zoom-preview--dark")).toBe(
        true,
      );
      expect(preview?.getAttribute("aria-hidden")).toBe("true");
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(trigger);
    } finally {
      unmount();
      trigger.remove();
    }
  });

  it("closes and hides the preview when its source is disconnected", () => {
    const { trigger, sourceImage } = createPreviewOrigin();
    const onClose = vi.fn();
    const result = renderPreview(sourceImage, onClose);
    const preview = document.querySelector<HTMLElement>(
      "[data-image-zoom-preview]",
    );
    expect(preview?.style.visibility).toBe("visible");
    trigger.remove();
    fireEvent(window, new Event("resize"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(preview?.style.visibility).toBe("hidden");
    result.unmount();
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

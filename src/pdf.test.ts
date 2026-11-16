import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkResumePdfAvailability,
  downloadResumePdf,
  RESUME_PDF_DOWNLOAD_URL,
  RESUME_PDF_FILENAME,
} from "./pdf";

class MockRequest {
  static latest: MockRequest;
  status = 200;
  response: unknown = new Blob(["pdf"]);
  responseType = "";
  open = vi.fn();
  send = vi.fn();
  abort = vi.fn();
  listeners: Record<string, (event: ProgressEvent) => void> = {};

  constructor() {
    MockRequest.latest = this;
  }

  addEventListener(type: string, listener: (event: ProgressEvent) => void) {
    this.listeners[type] = listener;
  }

  emit(type: string, event = new ProgressEvent(type)) {
    this.listeners[type](event);
  }
}

describe("resume PDF", () => {
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    revokeObjectURL.mockReset();
    vi.stubGlobal("XMLHttpRequest", MockRequest);
    vi.stubGlobal("fetch", vi.fn());
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:resume"),
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window.URL as Partial<typeof URL>).createObjectURL;
    delete (window.URL as Partial<typeof URL>).revokeObjectURL;
  });

  it("checks the reference URL with HEAD and returns response availability", async () => {
    expect(RESUME_PDF_DOWNLOAD_URL).toBe(
      "https://ohm-mho.space/assets/Nawaphon_Isarathanachaikul.pdf",
    );
    const controller = new AbortController();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    await expect(checkResumePdfAvailability(controller.signal)).resolves.toBe(
      true,
    );
    expect(fetch).toHaveBeenCalledWith(RESUME_PDF_DOWNLOAD_URL, {
      method: "HEAD",
      signal: controller.signal,
    });
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    await expect(checkResumePdfAvailability()).resolves.toBe(false);
    vi.mocked(fetch).mockRejectedValueOnce(
      new DOMException("Aborted", "AbortError"),
    );
    await expect(checkResumePdfAvailability(controller.signal)).resolves.toBe(
      false,
    );
  });

  it("treats a browser CORS or network failure as unavailable", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(checkResumePdfAvailability()).resolves.toBe(false);
  });

  it("reports rounded, clamped and indeterminate progress and dispatches the blob", async () => {
    const progress = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {
        const anchor = document.querySelector<HTMLAnchorElement>(
          'a[href="blob:resume"]',
        );
        expect(anchor?.href).toBe("blob:resume");
        expect(anchor?.download).toBe(RESUME_PDF_FILENAME);
        expect(anchor?.hidden).toBe(true);
        expect(anchor?.isConnected).toBe(true);
      });
    const download = downloadResumePdf(progress);
    const request = MockRequest.latest;
    function checkRequestAndProgress() {
      expect(request.open).toHaveBeenCalledWith(
        "GET",
        RESUME_PDF_DOWNLOAD_URL,
        true,
      );
      expect(request.responseType).toBe("blob");
      expect(request.send).toHaveBeenCalledOnce();
      request.emit(
        "progress",
        new ProgressEvent("progress", { loaded: 1, total: 3 }),
      );
      request.emit(
        "progress",
        new ProgressEvent("progress", { loaded: 200, total: 100 }),
      );
      request.emit(
        "progress",
        new ProgressEvent("progress", { loaded: 1, total: 0 }),
      );
      expect(progress.mock.calls).toEqual([[33], [100], [null]]);
      request.emit("load");
    }
    checkRequestAndProgress();
    await expect(download).resolves.toBeUndefined();
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[href="blob:resume"]')).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:resume");
  });

  describe("failure cases", () => {
    it.each(["error", "abort"])("rejects a request %s", async (event) => {
      const download = downloadResumePdf();
      MockRequest.latest.emit(event);
      await expect(download).rejects.toThrow();
    });

    it.each([404, 500, 0])(
      "rejects unsuccessful HTTP status %s",
      async (status) => {
        const download = downloadResumePdf();
        MockRequest.latest.status = status;
        MockRequest.latest.emit("load");
        await expect(download).rejects.toThrow(`(${String(status)})`);
      },
    );

    it("rejects a missing blob", async () => {
      const download = downloadResumePdf();
      MockRequest.latest.response = null;
      MockRequest.latest.emit("load");
      await expect(download).rejects.toThrow();
    });

    it("cleans up and rejects when browser download dispatch fails", async () => {
      const error = new Error("click failed");
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
        throw error;
      });
      const download = downloadResumePdf();
      MockRequest.latest.emit("load");
      await expect(download).rejects.toBe(error);
      expect(document.querySelector('a[href="blob:resume"]')).toBeNull();
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:resume");
    });

    it("rejects if XMLHttpRequest is unavailable", async () => {
      vi.stubGlobal("XMLHttpRequest", undefined);
      await expect(downloadResumePdf()).rejects.toThrow();
    });

    it("rejects and aborts when a progress callback throws", async () => {
      const error = new Error("progress failed");
      const download = downloadResumePdf(() => {
        throw error;
      });
      MockRequest.latest.emit("progress");
      await expect(download).rejects.toBe(error);
      expect(MockRequest.latest.abort).toHaveBeenCalledOnce();
    });

    it("revokes the object URL when anchor creation fails", async () => {
      const error = new Error("anchor failed");
      vi.spyOn(document, "createElement").mockImplementation(() => {
        throw error;
      });
      const download = downloadResumePdf();
      MockRequest.latest.emit("load");
      await expect(download).rejects.toBe(error);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:resume");
    });
  });
});

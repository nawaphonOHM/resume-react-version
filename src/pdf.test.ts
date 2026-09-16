import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkResumePdfAvailability,
  downloadResumePdf,
  RESUME_PDF_DOWNLOAD_URL,
} from "./pdf";

class FakeXmlHttpRequest {
  status = 0;
  response: Blob | null = null;
  responseType = "";
  openedWith: { method: string; url: string; async: boolean } | null = null;
  private listeners = new Map<string, Array<(event?: unknown) => void>>();

  open(method: string, url: string, async = true) {
    this.openedWith = { method, url, async };
  }

  addEventListener(eventName: string, callback: (event?: unknown) => void) {
    const callbacks = this.listeners.get(eventName) ?? [];
    callbacks.push(callback);
    this.listeners.set(eventName, callbacks);
  }

  send() {}

  emit(eventName: string, event?: unknown) {
    const callbacks = this.listeners.get(eventName) ?? [];
    callbacks.forEach((callback) => callback(event));
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkResumePdfAvailability", () => {
  it("uses a HEAD request and returns true for an available file", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true } satisfies Pick<Response, "ok">);
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkResumePdfAvailability(signal)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(RESUME_PDF_DOWNLOAD_URL, {
      method: "HEAD",
      signal,
    });
  });

  it("returns false when the HEAD request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(checkResumePdfAvailability()).resolves.toBe(false);
  });
});

describe("downloadResumePdf", () => {
  it("resolves without download when XMLHttpRequest is unavailable", async () => {
    const originalXmlHttpRequest = globalThis.XMLHttpRequest;
    vi.stubGlobal("XMLHttpRequest", undefined);

    try {
      await expect(downloadResumePdf()).resolves.toBeUndefined();
    } finally {
      vi.stubGlobal("XMLHttpRequest", originalXmlHttpRequest);
    }
  });

  it("reports progress and resolves on successful download", async () => {
    const request = new FakeXmlHttpRequest();
    const downloadBlobMock = vi.fn();
    const progressValues: Array<number | null> = [];
    const resumeBlob = new Blob(["resume"], { type: "application/pdf" });

    const promise = downloadResumePdf(
      (progress) => progressValues.push(progress),
      {
        createRequest: () => request as unknown as XMLHttpRequest,
        handleBlobDownload: downloadBlobMock,
      },
    );

    request.status = 200;
    request.response = resumeBlob;
    request.emit("progress", { loaded: 25, total: 100 });
    request.emit("progress", { loaded: 3, total: 0 });
    request.emit("load");

    await expect(promise).resolves.toBeUndefined();
    expect(request.openedWith).toEqual({
      method: "GET",
      url: RESUME_PDF_DOWNLOAD_URL,
      async: true,
    });
    expect(progressValues).toEqual([25, null]);
    expect(downloadBlobMock).toHaveBeenCalledWith(resumeBlob);
  });

  it("rejects when download response status is not successful", async () => {
    const request = new FakeXmlHttpRequest();
    const promise = downloadResumePdf(undefined, {
      createRequest: () => request as unknown as XMLHttpRequest,
      handleBlobDownload: vi.fn(),
    });

    request.status = 503;
    request.emit("load");

    await expect(promise).rejects.toThrow("Failed to download resume PDF (503).");
  });
});

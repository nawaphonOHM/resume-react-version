import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkResumePdfAvailability, downloadResumePdf } from "../pdf";
import { useResumeDownload } from "./use-resume-download";

vi.mock("../pdf", () => ({
  checkResumePdfAvailability: vi.fn(),
  downloadResumePdf: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useResumeDownload", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("uses the plain labels while checking and once available", async () => {
    const check = deferred<boolean>();
    vi.mocked(checkResumePdfAvailability).mockReturnValue(check.promise);
    const { result } = renderHook(() => useResumeDownload());
    expect(result.current.downloadAvailable).toBeNull();
    expect(result.current.downloadControlText).toBe("Download PDF");
    expect(result.current.downloadControlLabel).toBe("Download résumé as PDF");
    await act(async () => {
      check.resolve(true);
      await check.promise;
    });
    expect(result.current.downloadControlText).toBe("Download PDF");
    expect(result.current.downloadControlLabel).toBe("Download résumé as PDF");
  });

  it("requires confirmation when unavailable and permits cancel and retry", async () => {
    vi.mocked(checkResumePdfAvailability).mockResolvedValue(false);
    vi.mocked(downloadResumePdf).mockResolvedValue();
    const { result } = renderHook(() => useResumeDownload());
    await waitFor(() => {
      expect(result.current.downloadAvailable).toBe(false);
    });
    async function cancelAndReopenConfirmation() {
      expect(result.current.downloadControlText).toBe(
        "Download PDF (unavailable)",
      );
      expect(result.current.downloadControlLabel).toContain(
        "file may be unavailable",
      );
      await act(async () => result.current.handleDownloadRequest());
      expect(result.current.confirmDownloadOpen).toBe(true);
      expect(downloadResumePdf).not.toHaveBeenCalled();
      act(() => {
        result.current.setConfirmDownloadOpen(false);
      });
      expect(result.current.confirmDownloadOpen).toBe(false);
      await act(async () => result.current.handleDownloadRequest());
    }
    await cancelAndReopenConfirmation();
    act(() => {
      result.current.setConfirmDownloadOpen(false);
    });
    await act(async () => result.current.startResumeDownload());
    expect(downloadResumePdf).toHaveBeenCalledOnce();
    expect(result.current.downloadAvailable).toBe(true);
  });

  it("reports pending progress, ignores duplicate starts and resets on success", async () => {
    vi.mocked(checkResumePdfAvailability).mockResolvedValue(true);
    const download = deferred<undefined>();
    vi.mocked(downloadResumePdf).mockReturnValue(download.promise);
    const { result } = renderHook(() => useResumeDownload());
    await waitFor(() => {
      expect(result.current.downloadAvailable).toBe(true);
    });
    function startAndCheckProgress() {
      let first!: Promise<void>;
      act(() => {
        first = result.current.handleDownloadRequest();
        void result.current.handleDownloadRequest();
        void result.current.startResumeDownload();
      });
      expect(downloadResumePdf).toHaveBeenCalledOnce();
      expect(result.current).toMatchObject({
        downloadPending: true,
        downloadControlText: "Downloading PDF…",
      });
      act(() => vi.mocked(downloadResumePdf).mock.calls[0][0]?.(42));
      expect(result.current.downloadControlText).toBe("Downloading PDF (42%)");
      expect(result.current.downloadControlLabel).toBe(
        "Downloading résumé PDF (42%)",
      );
      act(() => vi.mocked(downloadResumePdf).mock.calls[0][0]?.(null));
      expect(result.current.downloadProgress).toBeNull();
      return first;
    }
    const first = startAndCheckProgress();
    await act(async () => {
      download.resolve(undefined);
      await first;
    });
    expect(result.current.downloadPending).toBe(false);
    expect(result.current.downloadProgress).toBeNull();
  });

  it("logs a failure and recovers on a confirmed retry", async () => {
    const error = new Error("network error");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(checkResumePdfAvailability).mockResolvedValue(true);
    vi.mocked(downloadResumePdf)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce();
    const { result } = renderHook(() => useResumeDownload());
    await waitFor(() => {
      expect(result.current.downloadAvailable).toBe(true);
    });
    async function expectFailureAndRequestRetry() {
      await act(async () => result.current.handleDownloadRequest());
      expect(result.current.downloadAvailable).toBe(false);
      expect(result.current).not.toHaveProperty("downloadError");
      expect(result.current.downloadPending).toBe(false);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(error);
      await act(async () => result.current.handleDownloadRequest());
      expect(result.current.confirmDownloadOpen).toBe(true);
    }
    await expectFailureAndRequestRetry();
    await act(async () => result.current.startResumeDownload());
    expect(result.current.downloadAvailable).toBe(true);
  });

  it("ignores a late availability result after a download starts", async () => {
    const check = deferred<boolean>();
    vi.mocked(checkResumePdfAvailability).mockReturnValue(check.promise);
    vi.mocked(downloadResumePdf).mockResolvedValue();
    const { result } = renderHook(() => useResumeDownload());
    const signal = vi.mocked(checkResumePdfAvailability).mock.calls[0][0];
    await act(async () => result.current.handleDownloadRequest());
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      check.resolve(false);
      await check.promise;
    });
    expect(result.current.downloadAvailable).toBe(true);
  });

  it("aborts the check and ignores progress and results after unmount", async () => {
    const check = deferred<boolean>();
    const download = deferred<undefined>();
    vi.mocked(checkResumePdfAvailability).mockReturnValue(check.promise);
    vi.mocked(downloadResumePdf).mockReturnValue(download.promise);
    const { result, unmount } = renderHook(() => useResumeDownload());
    const signal = vi.mocked(checkResumePdfAvailability).mock.calls[0][0];
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.handleDownloadRequest();
    });
    act(() => {
      unmount();
      expect(signal?.aborted).toBe(true);
    });
    await act(async () => {
      vi.mocked(downloadResumePdf).mock.calls[0][0]?.(50);
      check.resolve(false);
      download.resolve(undefined);
      await pending;
    });
  });
});

export const RESUME_PDF_DOWNLOAD_URL =
  "https://resume-images.ohm-mho.space/downloadable-resume/Nawaphon_Isarathanachaikul.pdf";
export const RESUME_PDF_FILENAME =
  "nawaphon-isarathanachaikul-resume-profile.pdf";

export type DownloadProgressCallback = (progress: number | null) => void;
const DOWNLOAD_FAILURE_MESSAGE = "Failed to download resume PDF.";
const DOWNLOAD_ABORTED_MESSAGE = "Resume PDF download was aborted.";
const SUCCESS_STATUS_MIN = 200;
const SUCCESS_STATUS_MAX = 299;

export async function checkResumePdfAvailability(
  signal?: AbortSignal,
): Promise<boolean> {
  if (typeof fetch === "undefined") {
    return false;
  }

  try {
    const response = await fetch(RESUME_PDF_DOWNLOAD_URL, {
      method: "HEAD",
      signal,
    });
    return response.ok;
  } catch {
    return false;
  }
}

function triggerBlobDownload(blob: Blob) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = RESUME_PDF_FILENAME;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
}

function toProgressPercentage(loaded: number, total: number): number | null {
  if (!(typeof total === "number" && total > 0)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
}

function isXmlHttpRequestSupported(): boolean {
  return typeof XMLHttpRequest !== "undefined";
}

function isSuccessfulDownloadResponse(
  request: XMLHttpRequest,
): request is XMLHttpRequest & { response: Blob } {
  return (
    request.status >= SUCCESS_STATUS_MIN &&
    request.status <= SUCCESS_STATUS_MAX &&
    Boolean(request.response)
  );
}

function createDownloadStatusError(status: number): Error {
  return new Error(`Failed to download resume PDF (${status || 0}).`);
}

function handleDownloadProgress(
  event: ProgressEvent<XMLHttpRequestEventTarget>,
  onProgress?: DownloadProgressCallback,
) {
  onProgress?.(toProgressPercentage(event.loaded, event.total));
}

export function downloadResumePdf(
  onProgress?: DownloadProgressCallback,
): Promise<void> {
  if (!isXmlHttpRequestSupported()) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", RESUME_PDF_DOWNLOAD_URL, true);
    request.responseType = "blob";

    request.addEventListener("progress", (event) =>
      handleDownloadProgress(event, onProgress),
    );

    request.addEventListener("load", () => {
      if (isSuccessfulDownloadResponse(request)) {
        triggerBlobDownload(request.response);
        resolve();
        return;
      }

      reject(createDownloadStatusError(request.status));
    });

    request.addEventListener("error", () => {
      reject(new Error(DOWNLOAD_FAILURE_MESSAGE));
    });

    request.addEventListener("abort", () => {
      reject(new Error(DOWNLOAD_ABORTED_MESSAGE));
    });

    request.send();
  });
}

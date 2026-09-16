export const RESUME_PDF_DOWNLOAD_URL =
  "https://resume-images.ohm-mho.space/downloadable-resume/Nawaphon_Isarathanachaikul.pdf";
export const RESUME_PDF_FILENAME =
  "nawaphon-isarathanachaikul-resume-profile.pdf";

export type DownloadProgressCallback = (progress: number | null) => void;
type DownloadBlobHandler = (blob: Blob) => void;
type DownloadRequestFactory = () => XMLHttpRequest;

export type DownloadResumePdfOptions = {
  createRequest?: DownloadRequestFactory;
  handleBlobDownload?: DownloadBlobHandler;
};

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

export function downloadResumePdf(
  onProgress?: DownloadProgressCallback,
  options?: DownloadResumePdfOptions,
): Promise<void> {
  const createRequest =
    options?.createRequest ??
    (typeof XMLHttpRequest === "undefined"
      ? null
      : () => new XMLHttpRequest());

  if (!createRequest) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const request = createRequest();
    const handleBlobDownload = options?.handleBlobDownload ?? triggerBlobDownload;
    request.open("GET", RESUME_PDF_DOWNLOAD_URL, true);
    request.responseType = "blob";

    request.addEventListener("progress", (event) => {
      onProgress?.(toProgressPercentage(event.loaded, event.total));
    });

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300 && request.response) {
        handleBlobDownload(request.response);
        resolve();
        return;
      }

      reject(
        new Error(`Failed to download resume PDF (${request.status || 0}).`),
      );
    });

    request.addEventListener("error", () => {
      reject(new Error("Failed to download resume PDF."));
    });

    request.addEventListener("abort", () => {
      reject(new Error("Resume PDF download was aborted."));
    });

    request.send();
  });
}

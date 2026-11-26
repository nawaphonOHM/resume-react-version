import { assetUrls } from "./data/asset-urls";

export const RESUME_PDF_DOWNLOAD_URL = assetUrls.file(
  "Nawaphon_Isarathanachaikul.pdf",
);
export const RESUME_PDF_FILENAME =
  "nawaphon-isarathanachaikul-resume-profile.pdf";

export type DownloadProgressCallback = (progress: number | null) => void;

// Cross-origin HEAD and blob GET requests require the asset host to allow this
// app's origin. A failed check can mean CORS or network failure, not a missing PDF.
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

function createDownloadAnchor(objectUrl: string): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = RESUME_PDF_FILENAME;
  anchor.hidden = true;
  return anchor;
}

function releaseDownloadAnchor(
  anchor: HTMLAnchorElement | undefined,
  objectUrl: string,
): void {
  try {
    anchor?.remove();
  } finally {
    window.URL.revokeObjectURL(objectUrl);
  }
}

function triggerBlobDownload(blob: Blob): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    throw new Error("Resume PDF download requires a browser.");
  }

  const objectUrl = window.URL.createObjectURL(blob);
  let anchor: HTMLAnchorElement | undefined;
  try {
    anchor = createDownloadAnchor(objectUrl);
    document.body.append(anchor);
    anchor.click();
  } finally {
    releaseDownloadAnchor(anchor, objectUrl);
  }
}

export function downloadResumePdf(
  onProgress?: DownloadProgressCallback,
): Promise<void> {
  if (typeof XMLHttpRequest === "undefined") {
    return Promise.reject(
      new Error("Resume PDF download requires XMLHttpRequest."),
    );
  }

  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", RESUME_PDF_DOWNLOAD_URL, true);
    request.responseType = "blob";

    request.addEventListener("progress", (event) => {
      try {
        if (!(typeof event.total === "number" && event.total > 0)) {
          onProgress?.(null);
          return;
        }

        const percentage = Math.min(
          100,
          Math.max(0, Math.round((event.loaded / event.total) * 100)),
        );

        onProgress?.(percentage);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("PDF progress callback failed.", { cause: error }),
        );
        request.abort();
      }
    });

    request.addEventListener("load", () => {
      if (
        request.status >= 200 &&
        request.status < 300 &&
        request.response instanceof Blob
      ) {
        try {
          triggerBlobDownload(request.response);
          resolve();
        } catch (error) {
          reject(
            error instanceof Error
              ? error
              : new Error("PDF download dispatch failed.", { cause: error }),
          );
        }
        return;
      }

      const statusCode = String(request.status || 0);
      reject(new Error(`Failed to download resume PDF (${statusCode}).`));
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

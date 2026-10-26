export const RESUME_PDF_DOWNLOAD_URL =
  "https://resume-images.ohm-mho.space/downloadable-resume/Nawaphon_Isarathanachaikul.pdf";
export const RESUME_PDF_FILENAME =
  "nawaphon-isarathanachaikul-resume-profile.pdf";

export type DownloadProgressCallback = (progress: number | null) => void;

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

function triggerBlobDownload(blob: Blob): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = createDownloadAnchor(objectUrl);

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
}

export function downloadResumePdf(
  onProgress?: DownloadProgressCallback,
): Promise<void> {
  if (typeof XMLHttpRequest === "undefined") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", RESUME_PDF_DOWNLOAD_URL, true);
    request.responseType = "blob";

    request.addEventListener("progress", (event) => {
      if (!(typeof event.total === "number" && event.total > 0)) {
        onProgress?.(null);
        return;
      }

      const percentage = Math.min(
        100,
        Math.max(0, Math.round((event.loaded / event.total) * 100)),
      );

      onProgress?.(percentage);
    });

    request.addEventListener("load", () => {
      if (
        request.status >= 200 &&
        request.status < 300 &&
        request.response instanceof Blob
      ) {
        triggerBlobDownload(request.response);
        resolve();
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

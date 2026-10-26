import { useEffect, useMemo, useState } from "react";
import { checkResumePdfAvailability, downloadResumePdf } from "../pdf";

function computeDownloadControlLabel(
  downloadPending: boolean,
  downloadAvailable: boolean | null,
  downloadProgress: number | null,
): string {
  if (!downloadPending) {
    return downloadAvailable === false
      ? "Download résumé as PDF (file may be unavailable)"
      : "Download résumé as PDF";
  }

  return typeof downloadProgress === "number"
    ? `Downloading résumé PDF (${String(downloadProgress)}%)`
    : "Downloading résumé PDF";
}

function computeDownloadControlText(
  downloadPending: boolean,
  downloadAvailable: boolean | null,
  downloadProgress: number | null,
): string {
  if (!downloadPending) {
    if (downloadAvailable === false) {
      return "Download PDF (unavailable)";
    }
    if (downloadAvailable === null) {
      return "Download PDF (checking)";
    }
    return "Download PDF";
  }

  return typeof downloadProgress === "number"
    ? `Downloading PDF (${String(downloadProgress)}%)`
    : "Downloading PDF…";
}

export function useResumeDownload() {
  const [downloadAvailable, setDownloadAvailable] = useState<boolean | null>(
    null,
  );
  const [downloadPending, setDownloadPending] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [confirmDownloadOpen, setConfirmDownloadOpen] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    void checkResumePdfAvailability(abortController.signal).then(
      (isAvailable) => {
        if (!abortController.signal.aborted) {
          setDownloadAvailable(isAvailable);
        }
      },
    );

    return () => {
      abortController.abort();
    };
  }, []);

  const { downloadControlLabel, downloadControlText } = useMemo(
    () => ({
      downloadControlLabel: computeDownloadControlLabel(
        downloadPending,
        downloadAvailable,
        downloadProgress,
      ),
      downloadControlText: computeDownloadControlText(
        downloadPending,
        downloadAvailable,
        downloadProgress,
      ),
    }),
    [downloadAvailable, downloadPending, downloadProgress],
  );

  const startResumeDownload = async () => {
    setDownloadPending(true);
    setDownloadProgress(null);

    try {
      await downloadResumePdf((progress) => {
        setDownloadProgress(progress);
      });
      setDownloadAvailable(true);
    } catch (error) {
      setDownloadAvailable(false);
      console.error(error);
    } finally {
      setDownloadPending(false);
      setDownloadProgress(null);
    }
  };

  const handleDownloadRequest = async () => {
    if (downloadPending) {
      return;
    }

    if (downloadAvailable === false) {
      setConfirmDownloadOpen(true);
      return;
    }

    await startResumeDownload();
  };

  return {
    downloadAvailable,
    downloadPending,
    downloadProgress,
    confirmDownloadOpen,
    setConfirmDownloadOpen,
    downloadControlLabel,
    downloadControlText,
    startResumeDownload,
    handleDownloadRequest,
  };
}

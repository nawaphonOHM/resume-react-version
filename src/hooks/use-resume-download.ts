import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { checkResumePdfAvailability, downloadResumePdf } from "../pdf";

type ResumeDownload = {
  downloadAvailable: boolean | null;
  downloadPending: boolean;
  downloadProgress: number | null;
  confirmDownloadOpen: boolean;
  setConfirmDownloadOpen: Dispatch<SetStateAction<boolean>>;
  downloadControlLabel: string;
  downloadControlText: string;
  startResumeDownload: () => Promise<void>;
  handleDownloadRequest: () => Promise<void>;
};

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
    return downloadAvailable === false
      ? "Download PDF (unavailable)"
      : "Download PDF";
  }

  return typeof downloadProgress === "number"
    ? `Downloading PDF (${String(downloadProgress)}%)`
    : "Downloading PDF…";
}

function useDownloadLifecycle(
  setDownloadAvailable: Dispatch<SetStateAction<boolean | null>>,
) {
  const mountedRef = useRef(false);
  const pendingRef = useRef(false);
  const availabilityCheckRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const abortController = new AbortController();
    availabilityCheckRef.current = abortController;

    void checkResumePdfAvailability(abortController.signal).then(
      (isAvailable) => {
        if (!abortController.signal.aborted) {
          setDownloadAvailable(isAvailable);
        }
      },
    );

    return () => {
      mountedRef.current = false;
      abortController.abort();
      if (availabilityCheckRef.current === abortController) {
        availabilityCheckRef.current = null;
      }
    };
  }, [setDownloadAvailable]);

  return { mountedRef, pendingRef, availabilityCheckRef };
}

type DownloadCallbacks = {
  onProgress: (progress: number | null) => void;
  onSuccess: () => void;
  onError: (error: unknown) => void;
  onFinish: () => void;
};

async function performResumeDownload(callbacks: DownloadCallbacks) {
  try {
    await downloadResumePdf(callbacks.onProgress);
    callbacks.onSuccess();
  } catch (error) {
    callbacks.onError(error);
  } finally {
    callbacks.onFinish();
  }
}

export function useResumeDownload(): ResumeDownload {
  const [downloadAvailable, setDownloadAvailable] = useState<boolean | null>(
    null,
  );
  const [downloadPending, setDownloadPending] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [confirmDownloadOpen, setConfirmDownloadOpen] = useState(false);
  const { mountedRef, pendingRef, availabilityCheckRef } =
    useDownloadLifecycle(setDownloadAvailable);

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
    if (pendingRef.current || !mountedRef.current) {
      return;
    }

    pendingRef.current = true;
    availabilityCheckRef.current?.abort();
    setDownloadPending(true);
    setDownloadProgress(null);

    await performResumeDownload({
      onProgress: (progress) => {
        if (mountedRef.current) {
          setDownloadProgress(progress);
        }
      },
      onSuccess: () => {
        if (mountedRef.current) {
          setDownloadAvailable(true);
        }
      },
      onError: (error) => {
        if (mountedRef.current) {
          setDownloadAvailable(false);
        }
        console.error(error);
      },
      onFinish: () => {
        pendingRef.current = false;
        if (mountedRef.current) {
          setDownloadPending(false);
          setDownloadProgress(null);
        }
      },
    });
  };

  const handleDownloadRequest = async () => {
    if (pendingRef.current || !mountedRef.current) {
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

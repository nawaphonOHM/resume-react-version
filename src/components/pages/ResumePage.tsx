import { useCallback, useState } from "react";
import type { ZoomImage } from "../common/image-zoom";
import { DownloadConfirmDialog } from "../dialogs/DownloadConfirmDialog";
import { ImageZoomDialog } from "../dialogs/ImageZoomDialog";
import { ErrorView } from "../layout/ErrorView";
import { Footer } from "../layout/Footer";
import { Header } from "../layout/Header";
import { LoadingView } from "../layout/LoadingView";
import {
  ResumeContent,
  type ResumeContentProps,
} from "../layout/ResumeContent";
import { useActiveSection } from "../../hooks/use-active-section";
import { useBangkokClock } from "../../hooks/use-bangkok-clock";
import { useResumeData } from "../../hooks/use-resume-data";
import { useResumeDownload } from "../../hooks/use-resume-download";
import type { Theme } from "../../hooks/use-theme";
import type { ResumeProfile } from "../../resume-data";

interface HeaderIdentity {
  name: string;
  title: string;
  location: string;
}

interface ResumePageProps {
  theme: Theme;
  onToggleTheme: () => void;
}

function resolveProfileIdentity(profile?: ResumeProfile): HeaderIdentity {
  if (!profile) {
    return {
      name: "",
      title: "",
      location: "",
    };
  }
  return {
    name: profile.name,
    title: profile.title,
    location: profile.details.location,
  };
}

interface MainContentParams {
  isLoading: boolean;
  isErrorVisible: boolean;
  progress: number;
  onRetry: () => void;
  contentProps: ResumeContentProps;
}

function renderMainContent({
  isLoading,
  isErrorVisible,
  progress,
  onRetry,
  contentProps,
}: MainContentParams) {
  if (isLoading) {
    return <LoadingView progress={progress} />;
  }
  if (isErrorVisible) {
    return <ErrorView onRetry={onRetry} />;
  }
  return <ResumeContent {...contentProps} />;
}

export function ResumePage({ theme, onToggleTheme }: ResumePageProps) {
  const { activeSection } = useActiveSection();
  const clock = useBangkokClock();
  const download = useResumeDownload();
  const [zoomImage, setZoomImage] = useState<ZoomImage | null>(null);
  const { profile, isLoading, hasError, progress, reloadAll } = useResumeData({
    useFallback: false,
  });
  const selectZoomImage = useCallback((image: ZoomImage) => {
    // eslint-disable-next-line complexity
    setZoomImage((current) => {
      if (image.activation === "hover-exit") {
        return current?.origin === image.origin &&
          current.activation === "hover"
          ? null
          : current;
      }
      if (
        (image.activation === "touch" || image.activation === "keyboard") &&
        current?.origin === image.origin &&
        current.activation !== "hover"
      ) {
        return null;
      }
      return image;
    });
  }, []);
  const closeZoomImage = useCallback(() => {
    setZoomImage(null);
  }, []);
  const identity = resolveProfileIdentity(profile);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <Header
        name={identity.name}
        activeSection={activeSection}
        theme={theme}
        onToggleTheme={onToggleTheme}
        downloadPending={download.downloadPending}
        downloadControlLabel={download.downloadControlLabel}
        downloadControlText={download.downloadControlText}
        onDownloadRequest={() => {
          void download.handleDownloadRequest();
        }}
      />

      {Boolean(download.downloadError) && (
        <p
          role="alert"
          className="mx-auto max-w-7xl px-6 py-3 text-sm text-[var(--app-text)]"
        >
          The PDF download failed. Check your connection or try again later.
        </p>
      )}

      {renderMainContent({
        isLoading,
        isErrorVisible: hasError && !profile,
        progress,
        onRetry: reloadAll,
        contentProps: {
          profile,
          availabilityStatus: clock.availabilityStatus,
          availabilityLabel: clock.availabilityLabel,
          bangkokTime: clock.bangkokTime,
          downloadAvailable: download.downloadAvailable,
          onSelectImage: selectZoomImage,
        },
      })}

      {profile && (
        <Footer
          name={identity.name}
          title={identity.title}
          location={identity.location}
        />
      )}

      <DownloadConfirmDialog
        isOpen={download.confirmDownloadOpen}
        onClose={() => {
          download.setConfirmDownloadOpen(false);
        }}
        onConfirm={() => {
          download.setConfirmDownloadOpen(false);
          void download.startResumeDownload();
        }}
      />

      <ImageZoomDialog image={zoomImage} onClose={closeZoomImage} />
    </div>
  );
}

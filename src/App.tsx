import { useState } from "react";
import { DownloadConfirmDialog } from "./components/dialogs/DownloadConfirmDialog";
import {
  ImageZoomDialog,
  type ZoomImage,
} from "./components/dialogs/ImageZoomDialog";
import { ErrorView } from "./components/layout/ErrorView";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { LoadingView } from "./components/layout/LoadingView";
import {
  ResumeContent,
  type ResumeContentProps,
} from "./components/layout/ResumeContent";
import { useActiveSection } from "./hooks/use-active-section";
import { useBangkokClock } from "./hooks/use-bangkok-clock";
import { useResumeData } from "./hooks/use-resume-data";
import { useResumeDownload } from "./hooks/use-resume-download";
import { useTheme } from "./hooks/use-theme";
import type { ResumeProfile } from "./resume-data";

interface HeaderIdentity {
  name: string;
  title: string;
  location: string;
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

function App() {
  const { theme, toggleTheme } = useTheme();
  const { activeSection } = useActiveSection();
  const clock = useBangkokClock();
  const download = useResumeDownload();
  const [zoomImage, setZoomImage] = useState<ZoomImage | null>(null);
  const { profile, isLoading, hasError, progress, reloadAll } = useResumeData({
    useFallback: false,
  });
  const identity = resolveProfileIdentity(profile);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <Header
        name={identity.name}
        title={identity.title}
        activeSection={activeSection}
        theme={theme}
        onToggleTheme={toggleTheme}
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
          onSelectImage: setZoomImage,
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

      <ImageZoomDialog
        image={zoomImage}
        onClose={() => {
          setZoomImage(null);
        }}
      />
    </div>
  );
}

export default App;

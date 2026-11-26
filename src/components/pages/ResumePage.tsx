import { useEffect, useState } from "react";
import { ImageZoomProvider } from "../common/ImageZoomProvider";
import { DownloadConfirmDialog } from "../dialogs/DownloadConfirmDialog";
import { ErrorView } from "../layout/ErrorView";
import { Footer } from "../layout/Footer";
import { Header } from "../layout/Header";
import { LoadingView } from "../layout/LoadingView";
import { ResumeContent } from "../layout/ResumeContent";
import { useActiveSection } from "../../hooks/use-active-section";
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
  profile: ResumeProfile | undefined;
  progress: number;
  onRetry: () => void;
  renderAll: boolean;
}

function usePrintRenderAll(): boolean {
  const [renderAll, setRenderAll] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => {
      setRenderAll(true);
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
    };
  }, []);

  return renderAll;
}

function renderMainContent({
  isLoading,
  isErrorVisible,
  profile,
  progress,
  onRetry,
  renderAll,
}: MainContentParams) {
  if (isLoading) {
    return <LoadingView progress={progress} />;
  }
  if (isErrorVisible || !profile) {
    return <ErrorView onRetry={onRetry} />;
  }
  return <ResumeContent profile={profile} renderAll={renderAll} />;
}

export function ResumePage({ theme, onToggleTheme }: ResumePageProps) {
  const { activeSection } = useActiveSection();
  const download = useResumeDownload();
  const renderAll = usePrintRenderAll();
  const { profile, isLoading, hasError, progress, reloadAll } = useResumeData();
  const identity = resolveProfileIdentity(profile);

  return (
    <div className="resume-page">
      <Header
        activeSection={activeSection}
        theme={theme}
        onToggleTheme={onToggleTheme}
        downloadAvailable={download.downloadAvailable}
        downloadPending={download.downloadPending}
        downloadControlLabel={download.downloadControlLabel}
        downloadControlText={download.downloadControlText}
        onDownloadRequest={() => {
          void download.handleDownloadRequest();
        }}
      />

      <main id="main-content" tabIndex={-1} className="resume-main">
        <div className="resume-content relative z-[1] mx-auto w-full max-w-resume px-4 sm:px-6 lg:px-8">
          <ImageZoomProvider>
            {renderMainContent({
              isLoading,
              isErrorVisible: hasError,
              profile,
              progress,
              onRetry: reloadAll,
              renderAll,
            })}
          </ImageZoomProvider>
        </div>
      </main>

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
    </div>
  );
}

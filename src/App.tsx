import { useState } from "react";
import { DownloadConfirmDialog } from "./components/dialogs/DownloadConfirmDialog";
import {
  ImageZoomDialog,
  type ZoomImage,
} from "./components/dialogs/ImageZoomDialog";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { ResumeContent } from "./components/layout/ResumeContent";
import { useActiveSection } from "./hooks/use-active-section";
import { useBangkokClock } from "./hooks/use-bangkok-clock";
import { useResumeDownload } from "./hooks/use-resume-download";
import { useTheme } from "./hooks/use-theme";

function App() {
  const { theme, toggleTheme } = useTheme();
  const { activeSection } = useActiveSection();
  const clock = useBangkokClock();
  const download = useResumeDownload();
  const [zoomImage, setZoomImage] = useState<ZoomImage | null>(null);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <Header
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

      <ResumeContent
        availabilityStatus={clock.availabilityStatus}
        availabilityLabel={clock.availabilityLabel}
        bangkokTime={clock.bangkokTime}
        bangkokHour={clock.bangkokHour}
        downloadAvailable={download.downloadAvailable}
        onSelectImage={setZoomImage}
      />

      <Footer />

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

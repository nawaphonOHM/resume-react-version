import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./VideoPage.css";

export function VideoPage() {
  const mainContentRef = useRef<HTMLElement>(null);
  const playerFrameRef = useRef<HTMLIFrameElement>(null);
  const shouldRestoreFocusRef = useRef(true);

  useLayoutEffect(() => {
    const cancelPendingFocusRestoration = () => {
      shouldRestoreFocusRef.current = false;
    };

    document.addEventListener("keydown", cancelPendingFocusRestoration);
    document.addEventListener("pointerdown", cancelPendingFocusRestoration);
    mainContentRef.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", cancelPendingFocusRestoration);
      document.removeEventListener(
        "pointerdown",
        cancelPendingFocusRestoration,
      );
    };
  }, []);

  const restorePageFocusAfterPlayerLoad = () => {
    if (!shouldRestoreFocusRef.current) {
      return;
    }

    shouldRestoreFocusRef.current = false;
    if (document.activeElement === playerFrameRef.current) {
      mainContentRef.current?.focus({ preventScroll: true });
    }
  };

  return (
    <main
      ref={mainContentRef}
      className="video-page"
      id="video-page-main"
      tabIndex={-1}
      aria-labelledby="video-page-title"
    >
      <section
        className="video-page__content"
        aria-describedby="video-page-description"
      >
        <h1 id="video-page-title">A video break</h1>
        <p id="video-page-description">
          This video will attempt to play automatically. If playback does not
          start, use the player controls.
        </p>

        <div className="video-page__frame">
          <iframe
            ref={playerFrameRef}
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&controls=1"
            title="Never Gonna Give You Up by Rick Astley — YouTube video"
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            sandbox="allow-scripts allow-presentation allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={restorePageFocusAfterPlayerLoad}
          />
        </div>

        <p className="video-page__fallback">
          If the embedded player is unavailable,{" "}
          <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">
            watch the video on YouTube
          </a>
          .
        </p>

        <Link className="video-page__resume-link" to="/">
          Return to the résumé
        </Link>
      </section>
    </main>
  );
}

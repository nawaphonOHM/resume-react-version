import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  loadYouTubeIframeApi,
  type YouTubeNamespace,
  type YouTubePlayer,
} from "../../services/youtube-iframe-api";
import "./VideoPage.css";

const VIDEO_ID = "dQw4w9WgXcQ";
const MINIMUM_PLAYER_WIDTH = 200;
const PLAYER_FRAME_TITLE =
  "Never Gonna Give You Up by Rick Astley — YouTube video";
const PLAYER_REFERRER_POLICY = "strict-origin-when-cross-origin";

interface PlayerSize {
  width: number;
  height: number;
}

interface FocusGuard {
  cancel: () => void;
  restore: (playerFrame: HTMLIFrameElement | null) => void;
}

interface FrameWatcher {
  sync(): void;
  current(): HTMLIFrameElement | null;
  disconnect(): void;
}

interface PlayerSession {
  resize(size: PlayerSize): void;
  destroy(): void;
}

interface PlayerSessionOptions {
  host: HTMLElement;
  size: PlayerSize;
  onReady: (player: YouTubePlayer) => void;
}

interface VideoPlayerController {
  setSize(size: PlayerSize | null): void;
  dispose(): void;
}

function normalizeWidth(width: number): number {
  return Number.isFinite(width) ? Math.max(0, width) : 0;
}

// YouTube does not support players narrower or shorter than 200 px.
function playerSizeFor(frameWidth: number): PlayerSize | null {
  const width = Math.floor(frameWidth);
  if (width < MINIMUM_PLAYER_WIDTH) {
    return null;
  }

  return {
    width,
    height: Math.max(MINIMUM_PLAYER_WIDTH, Math.round((width * 9) / 16)),
  };
}

function observeFrameWidth(
  host: HTMLElement,
  onWidth: (width: number) => void,
): () => void {
  const measure = () => {
    onWidth(normalizeWidth(host.getBoundingClientRect().width));
  };
  const ResizeObserverConstructor = globalThis.ResizeObserver;
  measure();

  if (typeof ResizeObserverConstructor !== "function") {
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }

  const observer = new ResizeObserverConstructor((entries) => {
    const entry = entries.find((candidate) => candidate.target === host);
    onWidth(
      normalizeWidth(
        entry?.contentRect.width ?? host.getBoundingClientRect().width,
      ),
    );
  });
  observer.observe(host);
  return () => {
    observer.disconnect();
  };
}

// Focus returns to the page once, and only while the reader has not interacted.
function createFocusGuard(main: HTMLElement): FocusGuard {
  let pending = true;

  return {
    cancel: () => {
      pending = false;
    },
    restore: (playerFrame) => {
      if (!pending) {
        return;
      }

      pending = false;
      if (document.activeElement === playerFrame) {
        main.focus({ preventScroll: true });
      }
    },
  };
}

function enforceFrameAttributes(playerFrame: HTMLIFrameElement): void {
  if (playerFrame.getAttribute("title") !== PLAYER_FRAME_TITLE) {
    playerFrame.setAttribute("title", PLAYER_FRAME_TITLE);
  }
  if (playerFrame.getAttribute("referrerpolicy") !== PLAYER_REFERRER_POLICY) {
    playerFrame.setAttribute("referrerpolicy", PLAYER_REFERRER_POLICY);
  }
}

function observeFrameMutations(
  host: HTMLElement,
  onMutation: () => void,
): MutationObserver | null {
  const MutationObserverConstructor = globalThis.MutationObserver;
  if (typeof MutationObserverConstructor !== "function") {
    return null;
  }

  const observer = new MutationObserverConstructor(onMutation);
  observer.observe(host, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["title", "referrerpolicy"],
  });
  return observer;
}

// YouTube creates and may rewrite the iframe, so its attributes are re-applied.
function createFrameWatcher(
  host: HTMLElement,
  onFrameLoad: (playerFrame: HTMLIFrameElement) => void,
): FrameWatcher {
  let observedFrame: HTMLIFrameElement | null = null;
  let loadListener: (() => void) | null = null;

  const release = () => {
    if (observedFrame && loadListener) {
      observedFrame.removeEventListener("load", loadListener);
    }
    loadListener = null;
    observedFrame = null;
  };
  const watch = (playerFrame: HTMLIFrameElement) => {
    release();
    observedFrame = playerFrame;
    loadListener = () => {
      onFrameLoad(playerFrame);
    };
    playerFrame.addEventListener("load", loadListener, { once: true });
  };
  const sync = () => {
    const playerFrame = host.querySelector("iframe");
    if (!playerFrame) {
      return;
    }

    enforceFrameAttributes(playerFrame);
    if (playerFrame !== observedFrame) {
      watch(playerFrame);
    }
  };
  const mutationObserver = observeFrameMutations(host, sync);
  sync();

  return {
    sync,
    current: () => observedFrame,
    disconnect: () => {
      mutationObserver?.disconnect();
      release();
    },
  };
}

function startPlayerSession({
  host,
  size,
  onReady,
}: PlayerSessionOptions): PlayerSession {
  const mount = document.createElement("div");
  let latestSize = size;
  let player: YouTubePlayer | null = null;
  let ready = false;
  let destroyed = false;
  host.append(mount);

  const createPlayer = (api: YouTubeNamespace) => {
    player = new api.Player(mount, { videoId: VIDEO_ID, ...latestSize });
    player.addEventListener("onReady", (event) => {
      ready = true;
      event.target.setSize(latestSize.width, latestSize.height);
      onReady(event.target);
    });
  };

  void loadYouTubeIframeApi()
    .then((api) => {
      if (!destroyed) {
        createPlayer(api);
      }
    })
    .catch((error: unknown) => {
      // The direct YouTube link below the frame remains available.
      console.error(error);
    });

  return {
    resize: (nextSize) => {
      latestSize = nextSize;
      if (ready) {
        player?.setSize(nextSize.width, nextSize.height);
      }
    },
    destroy: () => {
      destroyed = true;
      player?.destroy();
      host.replaceChildren();
    },
  };
}

function createVideoPlayerController(
  main: HTMLElement,
  host: HTMLElement,
): VideoPlayerController {
  const focusGuard = createFocusGuard(main);
  const frameWatcher = createFrameWatcher(host, focusGuard.restore);
  let session: PlayerSession | null = null;
  let disposed = false;

  const handleReady = (player: YouTubePlayer) => {
    frameWatcher.sync();
    focusGuard.restore(frameWatcher.current());

    const playerFrame = player.getIframe();
    queueMicrotask(() => {
      const isCurrentFrame =
        playerFrame === frameWatcher.current() &&
        playerFrame === host.querySelector("iframe");
      if (!disposed && isCurrentFrame) {
        player.playVideo();
      }
    });
  };
  document.addEventListener("keydown", focusGuard.cancel);
  document.addEventListener("pointerdown", focusGuard.cancel);

  return {
    setSize: (size) => {
      if (!size) {
        session?.destroy();
        session = null;
      } else if (session) {
        session.resize(size);
      } else {
        session = startPlayerSession({ host, size, onReady: handleReady });
      }
    },
    dispose: () => {
      disposed = true;
      session?.destroy();
      session = null;
      frameWatcher.disconnect();
      document.removeEventListener("keydown", focusGuard.cancel);
      document.removeEventListener("pointerdown", focusGuard.cancel);
    },
  };
}

function useVideoPlayer() {
  const mainRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<VideoPlayerController | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const playerSize = playerSizeFor(frameWidth);
  const playerWidth = playerSize?.width;
  const playerHeight = playerSize?.height;

  useLayoutEffect(() => {
    const main = mainRef.current;
    const host = hostRef.current;
    if (!main || !host) {
      return;
    }

    main.focus({ preventScroll: true });
    const controller = createVideoPlayerController(main, host);
    const stopObservingWidth = observeFrameWidth(host, setFrameWidth);
    controllerRef.current = controller;

    return () => {
      controllerRef.current = null;
      stopObservingWidth();
      controller.dispose();
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setSize(
      playerWidth && playerHeight
        ? { width: playerWidth, height: playerHeight }
        : null,
    );
  }, [playerWidth, playerHeight]);

  return { mainRef, hostRef, frameHeight: playerHeight ?? 0 };
}

export function VideoPage() {
  const { mainRef, hostRef, frameHeight } = useVideoPlayer();

  return (
    <main
      ref={mainRef}
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

        <div
          ref={hostRef}
          className="video-page__frame"
          style={{ height: frameHeight }}
        />

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

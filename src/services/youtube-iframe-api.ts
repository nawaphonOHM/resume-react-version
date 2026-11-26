export interface YouTubePlayerEvent {
  target: YouTubePlayer;
}

export type YouTubePlayerEventListener = (event: YouTubePlayerEvent) => void;

export interface YouTubePlayer {
  addEventListener(
    eventName: "onReady",
    listener: YouTubePlayerEventListener,
  ): void;
  getIframe(): HTMLIFrameElement;
  setSize(width: number, height: number): unknown;
  playVideo(): void;
  destroy(): void;
}

export interface YouTubePlayerOptions {
  videoId?: string;
  width?: number;
  height?: number;
}

export interface YouTubeNamespace {
  Player: new (
    container: HTMLElement,
    options?: YouTubePlayerOptions,
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: Partial<YouTubeNamespace>;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";

let pendingApi: Promise<YouTubeNamespace> | null = null;

// The API script defines `YT` before the player class is ready to be used.
function readLoadedApi(): YouTubeNamespace | null {
  const api = window.YT;
  return typeof api?.Player === "function" ? { Player: api.Player } : null;
}

function requestApi(): Promise<YouTubeNamespace> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const previousReadyCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReadyCallback?.();
      const api = readLoadedApi();
      if (api) {
        resolve(api);
      } else {
        reject(new Error("YouTube IFrame API became ready without a player"));
      }
    };
    script.addEventListener(
      "error",
      () => {
        script.remove();
        window.onYouTubeIframeAPIReady = previousReadyCallback;
        reject(
          new Error(
            `Failed to load YouTube API from ${YOUTUBE_IFRAME_API_URL}`,
          ),
        );
      },
      { once: true },
    );
    script.src = YOUTUBE_IFRAME_API_URL;
    script.async = true;
    document.head.append(script);
  });
}

/**
 * Loads the YouTube IFrame API once. Concurrent callers share one script
 * request, and a failed request can be retried by a later call.
 */
export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  const loadedApi = readLoadedApi();
  if (loadedApi) {
    return Promise.resolve(loadedApi);
  }

  pendingApi ??= requestApi().catch((error: unknown) => {
    pendingApi = null;
    throw error;
  });
  return pendingApi;
}

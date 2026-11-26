import { vi } from "vitest";
import type {
  YouTubePlayer,
  YouTubePlayerEventListener,
  YouTubePlayerOptions,
} from "../services/youtube-iframe-api";

export class YouTubeIframeApiPlayerTestDouble implements YouTubePlayer {
  static readonly instances: YouTubeIframeApiPlayerTestDouble[] = [];
  static createIframe = true;

  readonly iframe: HTMLIFrameElement;
  readonly container: HTMLElement;
  readonly options: YouTubePlayerOptions;
  readonly playbackCalls: string[] = [];
  readonly operations: string[] = [];
  readonly sizeCalls: [number, number][] = [];
  destroyed = false;
  private readonly eventListeners = new Map<
    string,
    Set<YouTubePlayerEventListener>
  >();

  constructor(container: HTMLElement, options: YouTubePlayerOptions = {}) {
    this.container = container;
    this.options = options;
    this.iframe = container.ownerDocument.createElement("iframe");
    // The real API replaces the element it is given with its iframe.
    if (YouTubeIframeApiPlayerTestDouble.createIframe) {
      container.replaceWith(this.iframe);
    }
    YouTubeIframeApiPlayerTestDouble.instances.push(this);
  }

  static reset(): void {
    this.instances.length = 0;
    this.createIframe = true;
  }

  static latest(): YouTubeIframeApiPlayerTestDouble {
    const player = this.instances.at(-1);
    if (!player) throw new Error("No YouTube player was created");
    return player;
  }

  addEventListener(
    eventName: "onReady",
    listener: YouTubePlayerEventListener,
  ): void {
    const listeners = this.eventListeners.get(eventName) ?? new Set();
    listeners.add(listener);
    this.eventListeners.set(eventName, listeners);
  }

  emitReady(): void {
    for (const listener of this.eventListeners.get("onReady") ?? []) {
      listener({ target: this });
    }
  }

  getIframe(): HTMLIFrameElement {
    return this.iframe;
  }

  setSize(width: number, height: number): void {
    this.sizeCalls.push([width, height]);
    this.operations.push("setSize");
  }

  playVideo(): void {
    this.playbackCalls.push("playVideo");
    this.operations.push("playVideo");
  }

  destroy(): void {
    this.destroyed = true;
    this.iframe.remove();
  }
}

export function installYouTubeIframeApiTestDouble(): void {
  YouTubeIframeApiPlayerTestDouble.reset();
  vi.stubGlobal("YT", { Player: YouTubeIframeApiPlayerTestDouble });
}

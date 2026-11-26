import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubeIframeApiPlayerTestDouble } from "../test-fixtures/youtube-iframe-api";

const API_URL = "https://www.youtube.com/iframe_api";

type YouTubeIframeApiModule = typeof import("./youtube-iframe-api");

// The loader keeps one pending request per module instance.
async function importLoader(): Promise<YouTubeIframeApiModule> {
  vi.resetModules();
  return import("./youtube-iframe-api");
}

function apiScripts(): HTMLScriptElement[] {
  return Array.from(
    document.head.querySelectorAll<HTMLScriptElement>(
      `script[src="${API_URL}"]`,
    ),
  );
}

function finishLoading(
  api: unknown = { Player: YouTubeIframeApiPlayerTestDouble },
) {
  vi.stubGlobal("YT", api);
  window.onYouTubeIframeAPIReady?.();
}

function failLoading(script: HTMLScriptElement) {
  script.dispatchEvent(new Event("error"));
}

beforeEach(() => {
  vi.stubGlobal("YT", undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "onYouTubeIframeAPIReady");
  for (const script of apiScripts()) {
    script.remove();
  }
});

describe("loadYouTubeIframeApi", () => {
  it("resolves with an already loaded API without requesting the script", async () => {
    vi.stubGlobal("YT", { Player: YouTubeIframeApiPlayerTestDouble });
    const { loadYouTubeIframeApi } = await importLoader();

    const api = await loadYouTubeIframeApi();

    expect(api.Player).toBe(YouTubeIframeApiPlayerTestDouble);
    expect(apiScripts()).toHaveLength(0);
  });

  it("requests the API script asynchronously", async () => {
    const { loadYouTubeIframeApi, YOUTUBE_IFRAME_API_URL } =
      await importLoader();

    void loadYouTubeIframeApi();

    const [script] = apiScripts();
    expect(YOUTUBE_IFRAME_API_URL).toBe(API_URL);
    expect(apiScripts()).toHaveLength(1);
    expect(script.async).toBe(true);
  });

  it("waits for the player class when the namespace exists without it", async () => {
    vi.stubGlobal("YT", { loading: 1 });
    const { loadYouTubeIframeApi } = await importLoader();

    const pending = loadYouTubeIframeApi();
    expect(apiScripts()).toHaveLength(1);

    finishLoading();
    await expect(pending).resolves.toEqual({
      Player: YouTubeIframeApiPlayerTestDouble,
    });
  });

  it("shares one script request between concurrent callers", async () => {
    const { loadYouTubeIframeApi } = await importLoader();

    const first = loadYouTubeIframeApi();
    const second = loadYouTubeIframeApi();
    expect(second).toBe(first);
    expect(apiScripts()).toHaveLength(1);

    finishLoading();
    const [firstApi, secondApi] = await Promise.all([first, second]);
    expect(firstApi.Player).toBe(YouTubeIframeApiPlayerTestDouble);
    expect(secondApi).toBe(firstApi);
  });

  it("keeps a ready callback that another script registered earlier", async () => {
    const existingCallback = vi.fn();
    window.onYouTubeIframeAPIReady = existingCallback;
    const { loadYouTubeIframeApi } = await importLoader();

    const pending = loadYouTubeIframeApi();
    finishLoading();
    await pending;

    expect(existingCallback).toHaveBeenCalledOnce();
  });

  it("rejects when the API reports ready without a player class", async () => {
    const { loadYouTubeIframeApi } = await importLoader();

    const pending = loadYouTubeIframeApi();
    finishLoading({});

    await expect(pending).rejects.toThrow(
      "YouTube IFrame API became ready without a player",
    );
  });

  it("rejects and removes the script when it fails to load", async () => {
    const existingCallback = vi.fn();
    window.onYouTubeIframeAPIReady = existingCallback;
    const { loadYouTubeIframeApi } = await importLoader();

    const pending = loadYouTubeIframeApi();
    failLoading(apiScripts()[0]);

    await expect(pending).rejects.toThrow(
      `Failed to load YouTube API from ${API_URL}`,
    );
    expect(apiScripts()).toHaveLength(0);
    expect(window.onYouTubeIframeAPIReady).toBe(existingCallback);
  });

  it("requests the script again after a failed load", async () => {
    const { loadYouTubeIframeApi } = await importLoader();
    const failed = loadYouTubeIframeApi();
    failLoading(apiScripts()[0]);
    await expect(failed).rejects.toThrow();

    const retried = loadYouTubeIframeApi();
    expect(retried).not.toBe(failed);
    expect(apiScripts()).toHaveLength(1);

    finishLoading();
    await expect(retried).resolves.toEqual({
      Player: YouTubeIframeApiPlayerTestDouble,
    });
  });
});

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installResizeObserverTestDouble,
  ResizeObserverTestDouble,
} from "../../test-fixtures/resize-observer";
import {
  installYouTubeIframeApiTestDouble,
  YouTubeIframeApiPlayerTestDouble as PlayerDouble,
} from "../../test-fixtures/youtube-iframe-api";
import { VideoPage } from "./VideoPage";

const PLAYER_FRAME_TITLE =
  "Never Gonna Give You Up by Rick Astley — YouTube video";
const REFERRER_POLICY = "strict-origin-when-cross-origin";
const YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

interface VideoPageView {
  container: HTMLElement;
  main: HTMLElement;
  frame: HTMLElement;
  unmount: () => void;
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function mountVideoPage(): VideoPageView {
  const { container, unmount } = render(
    <MemoryRouter initialEntries={["/watch"]}>
      <VideoPage />
    </MemoryRouter>,
  );
  const main = container.querySelector<HTMLElement>("#video-page-main");
  const frame = container.querySelector<HTMLElement>(".video-page__frame");
  if (!main || !frame) throw new Error("Video page was not rendered");
  return { container, main, frame, unmount };
}

async function resizeFrame(frame: HTMLElement, width: number) {
  act(() => {
    ResizeObserverTestDouble.observing(frame).notifyWidth(frame, width);
  });
  await flush();
}

async function renderVideoPage(width = 640) {
  const view = mountVideoPage();
  await resizeFrame(view.frame, width);
  return view;
}

async function renderReadyPlayer(width = 640) {
  const view = await renderVideoPage(width);
  const player = PlayerDouble.latest();
  act(() => {
    player.emitReady();
  });
  await flush();
  return { ...view, player };
}

function getPlayerFrame(frame: HTMLElement): HTMLIFrameElement {
  const playerFrame = frame.querySelector("iframe");
  if (!playerFrame) throw new Error("Player iframe was not rendered");
  return playerFrame;
}

beforeEach(() => {
  installResizeObserverTestDouble();
  installYouTubeIframeApiTestDouble();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("VideoPage content", () => {
  it("describes the page and moves focus to its main landmark", () => {
    const { container, main } = mountVideoPage();

    expect(main.getAttribute("aria-labelledby")).toBe("video-page-title");
    expect(container.querySelector("#video-page-title")?.textContent).toBe(
      "A video break",
    );
    expect(
      container.querySelector("section")?.getAttribute("aria-describedby"),
    ).toBe("video-page-description");
    expect(document.activeElement).toBe(main);
  });

  it("provides direct YouTube and résumé navigation links", () => {
    const { container } = mountVideoPage();
    const resumeLink = container.querySelector(".video-page__resume-link");

    expect(
      container.querySelector(`a[href="${YOUTUBE_URL}"]`)?.textContent,
    ).toBe("watch the video on YouTube");
    expect(resumeLink?.getAttribute("href")).toBe("/");
    expect(resumeLink?.textContent).toBe("Return to the résumé");
  });
});

describe("VideoPage player", () => {
  it("creates the player for the video at the measured 16:9 size", async () => {
    const { frame } = await renderVideoPage(640.8);

    expect(PlayerDouble.instances).toHaveLength(1);
    expect(PlayerDouble.latest().options).toEqual({
      videoId: "dQw4w9WgXcQ",
      width: 640,
      height: 360,
    });
    expect(frame.style.height).toBe("360px");
    expect(frame.querySelectorAll("iframe")).toHaveLength(1);
  });

  it("gives the iframe its descriptive title and referrer policy", async () => {
    const { frame } = await renderVideoPage();
    const playerFrame = getPlayerFrame(frame);

    expect(playerFrame.getAttribute("title")).toBe(PLAYER_FRAME_TITLE);
    expect(playerFrame.getAttribute("referrerpolicy")).toBe(REFERRER_POLICY);
  });

  it("restores the title and referrer policy if YouTube changes them", async () => {
    const { frame } = await renderVideoPage();
    const playerFrame = getPlayerFrame(frame);

    playerFrame.setAttribute("title", "YouTube video player");
    playerFrame.removeAttribute("referrerpolicy");
    await flush();

    expect(playerFrame.getAttribute("title")).toBe(PLAYER_FRAME_TITLE);
    expect(playerFrame.getAttribute("referrerpolicy")).toBe(REFERRER_POLICY);
  });

  it("applies the size and requests playback once the player is ready", async () => {
    const { player } = await renderReadyPlayer();

    expect(player.sizeCalls).toEqual([[640, 360]]);
    expect(player.playbackCalls).toEqual(["playVideo"]);
    expect(player.operations).toEqual(["setSize", "playVideo"]);
  });

  it("does not request playback before the player reports ready", async () => {
    await renderVideoPage();

    expect(PlayerDouble.latest().playbackCalls).toEqual([]);
  });

  it("does not request playback from a player whose iframe was replaced", async () => {
    const { frame } = await renderVideoPage();
    const player = PlayerDouble.latest();

    act(() => {
      player.emitReady();
      getPlayerFrame(frame).replaceWith(document.createElement("iframe"));
    });
    await flush();

    expect(player.playbackCalls).toEqual([]);
  });

  it("does not request playback after the page is unmounted", async () => {
    const { unmount } = await renderVideoPage();
    const player = PlayerDouble.latest();

    act(() => {
      player.emitReady();
      unmount();
    });
    await flush();

    expect(player.playbackCalls).toEqual([]);
  });
});

describe("VideoPage sizing", () => {
  it("keeps narrow players at least 200 px tall", async () => {
    const { frame } = await renderVideoPage(250);

    expect(PlayerDouble.latest().options).toMatchObject({
      width: 250,
      height: 200,
    });
    expect(frame.style.height).toBe("200px");
  });

  it("does not create a player below YouTube's 200 px minimum width", async () => {
    const { container, frame } = await renderVideoPage(199.9);

    expect(PlayerDouble.instances).toHaveLength(0);
    expect(frame.childElementCount).toBe(0);
    expect(frame.style.height).toBe("0px");
    expect(container.querySelector(`a[href="${YOUTUBE_URL}"]`)).not.toBeNull();
  });

  it("resizes a ready player instead of recreating it", async () => {
    const { frame, player } = await renderReadyPlayer();

    await resizeFrame(frame, 960);

    expect(PlayerDouble.instances).toHaveLength(1);
    expect(player.sizeCalls.at(-1)).toEqual([960, 540]);
    expect(frame.style.height).toBe("540px");
  });

  it("applies the latest size when the player becomes ready after a resize", async () => {
    const { frame } = await renderVideoPage();
    const player = PlayerDouble.latest();

    await resizeFrame(frame, 800);
    expect(player.sizeCalls).toEqual([]);

    act(() => {
      player.emitReady();
    });

    expect(player.sizeCalls).toEqual([[800, 450]]);
  });

  it("destroys the player when the frame becomes too narrow and recreates it later", async () => {
    const { frame, player } = await renderReadyPlayer();

    await resizeFrame(frame, 150);
    expect(player.destroyed).toBe(true);
    expect(frame.childElementCount).toBe(0);
    expect(frame.style.height).toBe("0px");

    await resizeFrame(frame, 320);
    expect(PlayerDouble.instances).toHaveLength(2);
    expect(PlayerDouble.latest().options).toMatchObject({
      width: 320,
      height: 200,
    });
    expect(getPlayerFrame(frame).getAttribute("title")).toBe(
      PLAYER_FRAME_TITLE,
    );
  });

  it("measures and follows window resizes when ResizeObserver is unavailable", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { frame } = mountVideoPage();
    await flush();
    expect(PlayerDouble.instances).toHaveLength(0);

    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 480, 0),
    );
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    await flush();

    expect(PlayerDouble.latest().options).toMatchObject({
      width: 480,
      height: 270,
    });
  });
});

describe("VideoPage focus", () => {
  it("restores main landmark focus if the player takes focus while loading", async () => {
    const { main, frame } = await renderVideoPage();
    const playerFrame = getPlayerFrame(frame);

    playerFrame.focus();
    fireEvent.load(playerFrame);

    expect(document.activeElement).toBe(main);
  });

  it("uses the ready event as a first-load focus fallback", async () => {
    const { main, frame } = await renderVideoPage();
    getPlayerFrame(frame).focus();

    act(() => {
      PlayerDouble.latest().emitReady();
    });

    expect(document.activeElement).toBe(main);
  });

  it.each([
    ["keyboard navigation", () => fireEvent.keyDown(document, { key: "Tab" })],
    ["pointer interaction", () => fireEvent.pointerDown(document.body)],
  ])("does not restore focus after %s begins", async (_label, interact) => {
    const { frame } = await renderVideoPage();
    const playerFrame = getPlayerFrame(frame);

    playerFrame.focus();
    interact();
    fireEvent.load(playerFrame);

    expect(document.activeElement).toBe(playerFrame);
  });

  it("does not steal focus on repeated player loads", async () => {
    const { main, frame } = await renderVideoPage();
    const playerFrame = getPlayerFrame(frame);
    fireEvent.load(playerFrame);
    expect(document.activeElement).toBe(main);

    playerFrame.focus();
    fireEvent.load(playerFrame);
    act(() => {
      PlayerDouble.latest().emitReady();
    });

    expect(document.activeElement).toBe(playerFrame);
  });
});

describe("VideoPage resilience", () => {
  it("keeps the direct link when the player API never creates a frame", async () => {
    PlayerDouble.createIframe = false;
    const { container, frame } = await renderVideoPage();
    const player = PlayerDouble.latest();

    act(() => {
      player.emitReady();
    });
    await flush();

    expect(frame.querySelector("iframe")).toBeNull();
    expect(player.playbackCalls).toEqual([]);
    expect(container.querySelector(`a[href="${YOUTUBE_URL}"]`)).not.toBeNull();
  });

  it("keeps the iframe attributes on ready without MutationObserver", async () => {
    vi.stubGlobal("MutationObserver", undefined);
    const { frame, player } = await renderReadyPlayer();
    const playerFrame = getPlayerFrame(frame);

    expect(playerFrame.getAttribute("title")).toBe(PLAYER_FRAME_TITLE);
    expect(playerFrame.getAttribute("referrerpolicy")).toBe(REFERRER_POLICY);
    expect(player.playbackCalls).toEqual(["playVideo"]);
  });

  it("logs a failed API load and keeps the direct link", async () => {
    const failure = new Error("Failed to load YouTube API");
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("YT", {
      Player: function FailingPlayer() {
        throw failure;
      },
    });

    const { container, frame } = await renderVideoPage();

    expect(logError).toHaveBeenCalledExactlyOnceWith(failure);
    expect(frame.querySelector("iframe")).toBeNull();
    expect(container.querySelector(`a[href="${YOUTUBE_URL}"]`)).not.toBeNull();
  });

  it("destroys the player and disconnects the resize observer on unmount", async () => {
    const { frame, player, unmount } = await renderReadyPlayer();
    const resizeObserver = ResizeObserverTestDouble.observing(frame);

    unmount();

    expect(player.destroyed).toBe(true);
    expect(resizeObserver.disconnect).toHaveBeenCalledOnce();
  });

  it("removes its frame and document listeners on unmount", async () => {
    const { frame, unmount } = await renderVideoPage();
    const removeFrameListener = vi.spyOn(
      getPlayerFrame(frame),
      "removeEventListener",
    );
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");

    unmount();

    const removedTypes = removeDocumentListener.mock.calls.map(
      ([type]) => type,
    );
    expect(removeFrameListener).toHaveBeenCalledWith(
      "load",
      expect.any(Function),
    );
    expect(removedTypes).toContain("keydown");
    expect(removedTypes).toContain("pointerdown");
  });
});

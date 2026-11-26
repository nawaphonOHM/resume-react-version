import "./test-fixtures/match-media";
import {
  act,
  cleanup,
  fireEvent,
  render as renderComponent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { installIntersectionObserverMock } from "./components/layout/resume-content.test-fixtures";
import * as resumeDataHook from "./hooks/use-resume-data";
import * as downloadHook from "./hooks/use-resume-download";
import type { ResumeProfile } from "./resume-data";
import {
  expectZoomPreview,
  hoverImage,
  queryZoomPreview,
  setImageGeometry,
} from "./test-fixtures/image-zoom";
import {
  installResizeObserverTestDouble,
  ResizeObserverTestDouble,
} from "./test-fixtures/resize-observer";
import {
  installYouTubeIframeApiTestDouble,
  YouTubeIframeApiPlayerTestDouble,
} from "./test-fixtures/youtube-iframe-api";

const mockProfile: ResumeProfile = {
  name: "API Loaded Engineer",
  title: "Principal Engineer",
  summary: ["API Loaded summary point."],
  details: {
    location: "Bangkok, Thailand",
    phoneLabel: "081-234-5678",
    email: "api.loaded@example.com",
    nationality: "Thai",
    birthDate: "9 September 1996",
  },
  links: [
    {
      label: "GitHub",
      url: "https://github.com/nawaphonOHM",
    },
  ],
  skills: ["Kotlin", "Go", "React"],
  experience: [
    {
      role: "Backend Architect",
      company: "Tech Systems",
      companyLogo: {
        src: "https://techsystems.com/logo.png",
        width: 48,
        height: 48,
        surface: "light",
      },
      location: "Bangkok",
      period: "2021 - Present",
      employmentTypes: ["Full-time"],
      highlights: ["Designed distributed event mesh"],
      technologies: ["Kafka", "Go"],
    },
  ],
  education: {
    degree: "B.Eng Computer Engineering",
    institution: "PSU",
    institutionLogo: {
      src: "https://psu.ac.th/logo.png",
      width: 48,
      height: 48,
      surface: "light",
    },
    period: "2015 - 2019",
    gpax: "3.50",
    seniorProject: {
      name: "Smart IoT Gateway",
      url: "https://github.com/nawaphonOHM/iot-gateway",
    },
  },
};

function mockResumeDataState(
  overrides: Partial<resumeDataHook.UseResumeDataResult> = {},
) {
  vi.spyOn(resumeDataHook, "useResumeData").mockReturnValue({
    profile: mockProfile,
    isLoading: false,
    hasError: false,
    error: undefined,
    progress: 100,
    reloadAll: vi.fn(),
    ...overrides,
  });
}

function renderRoute(initialEntries: string[] = ["/"]) {
  return renderComponent(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

async function render(initialEntries?: string[]) {
  const view = renderRoute(initialEntries);
  await waitFor(() => {
    expect(view.container.querySelector("main")).not.toBeNull();
  });
  return view;
}

async function expectText(container: HTMLElement, ...texts: string[]) {
  await waitFor(() => {
    for (const text of texts) {
      expect(container.textContent).toContain(text);
    }
  });
}

async function renderFallbackRoute() {
  installResizeObserverTestDouble();
  installYouTubeIframeApiTestDouble();
  const view = await render(["/watch"]);
  const frame = view.container.querySelector(".video-page__frame");
  if (!frame) throw new Error("Fallback video frame was not rendered");

  act(() => {
    ResizeObserverTestDouble.observing(frame).notifyWidth(frame, 640);
  });
  await waitFor(() => {
    expect(frame.querySelector("iframe")).not.toBeNull();
  });
  return view;
}

function expectSingleMain(container: HTMLElement) {
  expect(container.querySelectorAll("main")).toHaveLength(1);
  expect(container.querySelector("main")?.id).toBe("main-content");
}

function mockUnavailableDownload(confirmDownloadOpen: boolean) {
  const download = {
    downloadAvailable: false,
    downloadPending: false,
    downloadProgress: null,
    confirmDownloadOpen,
    setConfirmDownloadOpen: vi.fn(),
    downloadControlLabel: "Download résumé as PDF (file may be unavailable)",
    downloadControlText: "Download PDF (unavailable)",
    startResumeDownload: vi.fn(),
    handleDownloadRequest: vi.fn(),
  };
  vi.spyOn(downloadHook, "useResumeDownload").mockReturnValue(download);
  return download;
}

describe("App component orchestration", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("fallback route", () => {
    it("renders the video fallback without loading résumé data on unmatched paths", async () => {
      const useResumeDataSpy = vi.spyOn(resumeDataHook, "useResumeData");

      const { container } = await renderFallbackRoute();

      const [player] = YouTubeIframeApiPlayerTestDouble.instances;
      expect(player.options).toEqual({
        videoId: "dQw4w9WgXcQ",
        width: 640,
        height: 360,
      });
      expect(container.querySelector("iframe")?.getAttribute("title")).toBe(
        "Never Gonna Give You Up by Rick Astley — YouTube video",
      );
      expect(useResumeDataSpy).not.toHaveBeenCalled();
      expect(container.textContent).toContain("A video break");
      expect(
        container.querySelector(
          'a[href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"]',
        ),
      ).not.toBeNull();
      expect(container.textContent).toContain("Return to the résumé");
    });

    it("keeps hash URLs on the résumé route", async () => {
      mockResumeDataState();

      const { container } = await render(["/#experience"]);

      expect(container.querySelector("iframe")).toBeNull();
      expect(container.querySelector('a[href="#experience"]')).not.toBeNull();
    });

    it("returns from the video fallback to the résumé route", async () => {
      mockResumeDataState();

      const { container } = await renderFallbackRoute();
      const [player] = YouTubeIframeApiPlayerTestDouble.instances;
      const resumeLink = container.querySelector(".video-page__resume-link");
      if (!resumeLink) {
        throw new Error("Fallback résumé link was not rendered");
      }
      fireEvent.click(resumeLink);

      await expectText(container, mockProfile.name);
      expect(container.querySelector("iframe")).toBeNull();
      expect(player.destroyed).toBe(true);
    });

    it("starts playback and keeps focus on the fallback page when the player is ready", async () => {
      const { container } = await renderFallbackRoute();
      const [player] = YouTubeIframeApiPlayerTestDouble.instances;
      const mainContent = container.querySelector("#video-page-main");
      expect(document.activeElement).toBe(mainContent);

      container.querySelector("iframe")?.focus();
      act(() => {
        player.emitReady();
      });

      expect(document.activeElement).toBe(mainContent);
      await waitFor(() => {
        expect(player.playbackCalls).toEqual(["playVideo"]);
      });
    });
  });

  describe("lifecycle views", () => {
    it("loads resume data without fallback options", async () => {
      const useResumeDataSpy = vi.spyOn(resumeDataHook, "useResumeData");
      mockResumeDataState();

      await render();

      expect(useResumeDataSpy).toHaveBeenCalledWith();
    });

    it("renders LoadingView when isLoading is true", async () => {
      mockResumeDataState({
        profile: undefined,
        isLoading: true,
        progress: 37.5,
      });

      const { container } = await render();

      const main = container.querySelector("main");
      const progressbar = main?.querySelector('[role="progressbar"]');
      expect(main?.id).toBe("main-content");
      expect(progressbar?.getAttribute("aria-valuenow")).toBe("38");
      expect(main?.textContent).toBe("Loading resume data...");
    });

    it("renders ErrorView and calls reloadAll on retry click", async () => {
      const mockReloadAll = vi.fn();
      mockResumeDataState({
        profile: undefined,
        isLoading: false,
        hasError: true,
        reloadAll: mockReloadAll,
      });

      const { container } = await render();
      expect(container.querySelector('main [role="alert"]')).not.toBeNull();
      expectSingleMain(container);

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(mockReloadAll).toHaveBeenCalledTimes(1);
    });

    it("renders ResumeContent and Header with API data when profile is loaded", async () => {
      mockResumeDataState();

      const { container } = await render();

      expect(container.textContent).toContain("API Loaded Engineer");
      expect(container.textContent).toContain("Principal Engineer");
      await expectText(
        container,
        "API Loaded summary point.",
        "Backend Architect",
      );
      expectSingleMain(container);
      expect(container.querySelector("main #about")).not.toBeNull();
      expect(container.querySelector("main footer")).toBeNull();
      expect(container.querySelector("footer")?.textContent).toBe(
        "API Loaded Engineer · Principal EngineerBangkok, Thailand",
      );
    });

    it("covers the page with the route loader until the page has mounted", async () => {
      mockResumeDataState();

      const { container } = renderRoute();
      const overlay = screen.getByRole("status", { name: "Loading page" });
      expect(overlay.classList.contains("route-loading-container")).toBe(true);

      await waitFor(() => {
        expect(container.querySelector("main")).not.toBeNull();
      });
      expect(overlay.classList.contains("route-loading-leave")).toBe(true);

      await waitFor(() => {
        expect(
          screen.queryByRole("status", { name: "Loading page" }),
        ).toBeNull();
      });
    });

    it("mounts every deferred section before printing", async () => {
      installIntersectionObserverMock();
      mockResumeDataState();

      const { container } = await render();
      expect(
        container.querySelectorAll("[data-resume-defer-placeholder]"),
      ).toHaveLength(3);
      expect(container.textContent).not.toContain("Backend Architect");

      act(() => {
        window.dispatchEvent(new Event("beforeprint"));
      });

      await expectText(
        container,
        "API Loaded summary point.",
        "Backend Architect",
        "B.Eng Computer Engineering",
      );
      expect(
        container.querySelectorAll("[data-resume-defer-placeholder]"),
      ).toHaveLength(0);
      expect(container.querySelectorAll("[data-resume-section]")).toHaveLength(
        5,
      );
    });
  });

  describe("interactive controls and dialogs", () => {
    it("toggles theme when clicking theme button", async () => {
      mockResumeDataState();

      const { container } = await render();

      const themeButton = Array.from(container.querySelectorAll("button")).find(
        (btn) => btn.getAttribute("aria-label")?.includes("Switch to"),
      );
      expect(themeButton).toBeDefined();

      const rootClasses = document.documentElement.classList;
      const startedDark = rootClasses.contains("resume-theme-dark");
      if (themeButton) {
        fireEvent.click(themeButton);
      }
      expect(rootClasses.contains("resume-theme-dark")).toBe(!startedDark);
      expect(rootClasses.contains("resume-theme-light")).toBe(startedDark);
    });

    it("opens a logo preview on hover and closes it on Escape", async () => {
      mockResumeDataState();
      const { container } = await render();

      await expectText(container, "B.Eng Computer Engineering");
      const logo = container.querySelector<HTMLImageElement>("#education img");
      if (!logo) throw new Error("Logo not found");
      setImageGeometry(logo);

      hoverImage(logo);
      expectZoomPreview("PSU", "https://psu.ac.th/logo.png");

      fireEvent.keyDown(document, { key: "Escape" });
      expect(queryZoomPreview()).toBeNull();
    });

    it("triggers download request when clicking header download button", async () => {
      mockResumeDataState();

      const mockHandleDownloadRequest = vi.fn();
      vi.spyOn(downloadHook, "useResumeDownload").mockReturnValue({
        downloadAvailable: true,
        downloadPending: false,
        downloadProgress: null,
        confirmDownloadOpen: false,
        setConfirmDownloadOpen: vi.fn(),
        downloadControlLabel: "Download résumé as PDF",
        downloadControlText: "Download PDF",
        startResumeDownload: vi.fn(),
        handleDownloadRequest: mockHandleDownloadRequest,
      });

      await render();

      fireEvent.click(
        screen.getByRole("button", { name: "Download résumé as PDF" }),
      );

      expect(mockHandleDownloadRequest).toHaveBeenCalledTimes(1);
    });

    it("confirms before downloading a PDF that is known to be unavailable", async () => {
      mockResumeDataState();
      const download = mockUnavailableDownload(true);

      await render();

      const dialog = screen.getByRole("dialog", { name: "Confirm Download" });
      expect(dialog.textContent).toContain(
        "The file may be unavailable. Do you confirm to continue?",
      );

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(download.setConfirmDownloadOpen).toHaveBeenCalledWith(false);
      expect(download.startResumeDownload).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      expect(download.startResumeDownload).toHaveBeenCalledOnce();
    });

    it("does not announce a failed PDF download on the page", async () => {
      mockResumeDataState();
      mockUnavailableDownload(false);

      const { container } = await render();

      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect(container.textContent).not.toContain("PDF download failed");
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("header and footer identity states", () => {
    it("shows no identity or footer while loading", async () => {
      mockResumeDataState({
        profile: undefined,
        isLoading: true,
        progress: 50,
      });

      const { container } = await render();
      expect(container.textContent).not.toContain("Nawaphon Isarathanachaikul");
      expect(container.querySelector("footer")).toBeNull();
    });

    it("shows no identity or footer in the error state", async () => {
      mockResumeDataState({
        profile: undefined,
        isLoading: false,
        hasError: true,
      });

      const { container } = await render();
      expect(container.textContent).not.toContain("Nawaphon Isarathanachaikul");
      expect(container.querySelector("footer")).toBeNull();
    });
  });
});

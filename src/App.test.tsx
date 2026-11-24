import {
  cleanup,
  fireEvent,
  render as renderComponent,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import App from "./App";
import * as resumeDataHook from "./hooks/use-resume-data";
import * as downloadHook from "./hooks/use-resume-download";
import type { ResumeProfile } from "./resume-data";

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
    isFallback: false,
    error: undefined,
    progress: 100,
    reloadAll: vi.fn(),
    ...overrides,
  });
}

function render(ui: ReactNode, initialEntries: string[] = ["/"]) {
  return renderComponent(
    <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>,
  );
}

function activateKeyboardPreview(
  button: HTMLButtonElement,
  source: HTMLImageElement,
) {
  Object.defineProperties(source, {
    naturalWidth: { configurable: true, value: 128 },
    naturalHeight: { configurable: true, value: 64 },
  });
  vi.spyOn(source, "getBoundingClientRect").mockReturnValue(
    new DOMRect(100, 100, 32, 16),
  );
  button.focus();
  fireEvent.click(button, { detail: 0 });
}

function expectKeyboardPreviewOpen(button: HTMLButtonElement) {
  expect(document.querySelector("[data-image-zoom-preview]")).not.toBeNull();
  expect(document.activeElement).toBe(button);
}

function expectKeyboardPreviewClosed() {
  expect(document.querySelector("[data-image-zoom-preview]")).toBeNull();
}

describe("App component orchestration", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("lifecycle views", () => {
    it("renders the video fallback without loading résumé data on unmatched paths", () => {
      const useResumeDataSpy = vi.spyOn(resumeDataHook, "useResumeData");

      const { container } = render(<App />, ["/watch"]);

      const playerFrame = container.querySelector<HTMLIFrameElement>("iframe");
      expect(playerFrame).not.toBeNull();
      expect(playerFrame?.getAttribute("sandbox")?.split(" ")).toEqual([
        "allow-scripts",
        "allow-presentation",
        "allow-popups",
        "allow-popups-to-escape-sandbox",
      ]);
      expect(useResumeDataSpy).not.toHaveBeenCalled();
      expect(container.textContent).toContain("A video break");
      expect(
        container.querySelector(
          'a[href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"]',
        ),
      ).not.toBeNull();
      expect(container.textContent).toContain("Return to the résumé");
    });

    it("keeps hash URLs on the résumé route", () => {
      mockResumeDataState();

      const { container } = render(<App />, ["/#experience"]);

      expect(container.querySelector("iframe")).toBeNull();
      expect(container.querySelector('a[href="#experience"]')).not.toBeNull();
    });

    it("returns from the video fallback to the résumé route", () => {
      mockResumeDataState();

      const { container } = render(<App />, ["/watch"]);
      const resumeLink = container.querySelector(".video-page__resume-link");
      if (!resumeLink) {
        throw new Error("Fallback résumé link was not rendered");
      }
      fireEvent.click(resumeLink);

      expect(container.querySelector("iframe")).toBeNull();
      expect(container.textContent).toContain(mockProfile.name);
    });

    it("restores initial focus after the video frame loads", () => {
      const { container } = render(<App />, ["/watch"]);
      const mainContent = container.querySelector("#video-page-main");
      const playerFrame = container.querySelector("iframe");

      expect(document.activeElement).toBe(mainContent);
      playerFrame?.focus();
      if (playerFrame) fireEvent.load(playerFrame);

      expect(document.activeElement).toBe(mainContent);
    });

    it("does not restore focus after the user interacts with the fallback page", () => {
      const { container } = render(<App />, ["/watch"]);
      const playerFrame = container.querySelector("iframe");

      playerFrame?.focus();
      fireEvent.keyDown(document, { key: "Tab" });
      if (playerFrame) fireEvent.load(playerFrame);

      expect(document.activeElement).toBe(playerFrame);
    });

    it("opts out of fallback data so exhausted API failures stay visible", () => {
      const useResumeDataSpy = vi.spyOn(resumeDataHook, "useResumeData");
      mockResumeDataState();

      render(<App />);

      expect(useResumeDataSpy).toHaveBeenCalledWith({ useFallback: false });
    });

    it("renders LoadingView when isLoading is true", () => {
      mockResumeDataState({
        profile: undefined,
        isLoading: true,
        progress: 37.5,
      });

      const { container } = render(<App />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar?.getAttribute("aria-valuenow")).toBe("38");
      expect(container.textContent).toContain("Loading resume data...");
    });

    it("renders ErrorView and calls reloadAll on retry click", () => {
      const mockReloadAll = vi.fn();
      mockResumeDataState({
        profile: undefined,
        isLoading: false,
        hasError: true,
        reloadAll: mockReloadAll,
      });

      const { container } = render(<App />);
      expect(container.querySelector('[role="alert"]')).not.toBeNull();

      const retryButton = Array.from(container.querySelectorAll("button")).find(
        (btn) => btn.textContent.includes("Retry"),
      );
      expect(retryButton).toBeDefined();
      if (retryButton) {
        fireEvent.click(retryButton);
      }
      expect(mockReloadAll).toHaveBeenCalledTimes(1);
    });

    it("renders ResumeContent and Header with API data when profile is loaded", () => {
      mockResumeDataState();

      const { container } = render(<App />);

      expect(container.textContent).toContain("API Loaded Engineer");
      expect(container.textContent).toContain("Principal Engineer");
      expect(container.textContent).toContain("API Loaded summary point.");
      expect(container.textContent).toContain("Backend Architect");
    });

    it("renders ResumeContent when isFallback is true with fallback profile", () => {
      mockResumeDataState({
        profile: mockProfile,
        isLoading: false,
        hasError: false,
        isFallback: true,
      });

      const { container } = render(<App />);
      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect(container.textContent).toContain("API Loaded Engineer");
    });
  });

  describe("interactive controls and dialogs", () => {
    it("toggles theme when clicking theme button", () => {
      mockResumeDataState();

      const { container } = render(<App />);

      const themeButton = Array.from(container.querySelectorAll("button")).find(
        (btn) => btn.getAttribute("aria-label")?.includes("Switch to"),
      );
      expect(themeButton).toBeDefined();

      const initialTheme = document.documentElement.dataset.theme;
      if (themeButton) {
        fireEvent.click(themeButton);
      }
      const updatedTheme = document.documentElement.dataset.theme;
      expect(updatedTheme).toBeDefined();
      expect(updatedTheme).not.toBe(initialTheme);
    });

    it("opens an anchored preview on keyboard activation and closes on Escape", () => {
      mockResumeDataState();
      const { container } = render(<App />);

      const logoBtn = container.querySelector<HTMLButtonElement>(
        'button[aria-label*="PSU logo"]',
      );
      expect(logoBtn).not.toBeNull();
      const source = logoBtn?.querySelector("img");
      if (!logoBtn || !source) throw new Error("Logo not found");
      activateKeyboardPreview(logoBtn, source);
      expectKeyboardPreviewOpen(logoBtn);
      fireEvent.keyDown(document, { key: "Escape" });
      expectKeyboardPreviewClosed();
    });

    it("triggers download request when clicking header download button", () => {
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

      const { container } = render(<App />);

      const downloadButton = Array.from(
        container.querySelectorAll("button"),
      ).find((btn) =>
        btn.getAttribute("aria-label")?.includes("Download résumé as PDF"),
      );
      expect(downloadButton).toBeDefined();
      if (downloadButton) {
        fireEvent.click(downloadButton);
      }

      expect(mockHandleDownloadRequest).toHaveBeenCalledTimes(1);
    });

    it("opens confirmation dialog when download request triggers with unavailable PDF", () => {
      mockResumeDataState();

      vi.spyOn(downloadHook, "useResumeDownload").mockReturnValue({
        downloadAvailable: false,
        downloadPending: false,
        downloadProgress: null,
        confirmDownloadOpen: true,
        setConfirmDownloadOpen: vi.fn(),
        downloadControlLabel: "Download résumé as PDF",
        downloadControlText: "Download PDF (unavailable)",
        startResumeDownload: vi.fn(),
        handleDownloadRequest: vi.fn(),
      });

      const { container } = render(<App />);

      expect(container.textContent).toContain("Confirm download");
    });

    it("announces a failed PDF download", () => {
      mockResumeDataState();
      vi.spyOn(downloadHook, "useResumeDownload").mockReturnValue({
        downloadAvailable: false,
        downloadPending: false,
        downloadProgress: null,
        downloadError: new Error("network error"),
        confirmDownloadOpen: false,
        setConfirmDownloadOpen: vi.fn(),
        downloadControlLabel: "Download résumé as PDF",
        downloadControlText: "Download PDF (unavailable)",
        startResumeDownload: vi.fn(),
        handleDownloadRequest: vi.fn(),
      });
      const { container } = render(<App />);
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        "PDF download failed",
      );
    });
  });

  describe("header and footer identity states", () => {
    it("does not show static name or identity in header/footer when loading", () => {
      mockResumeDataState({
        profile: undefined,
        isLoading: true,
        progress: 50,
      });

      const { container } = render(<App />);
      expect(container.querySelector(".header-identity-name")).toBeNull();
      expect(container.textContent).not.toContain("Nawaphon Isarathanachaikul");
      expect(container.querySelector("footer")).toBeNull();
    });

    it("does not show static name or identity in header/footer when in error state", () => {
      mockResumeDataState({
        profile: undefined,
        isLoading: false,
        hasError: true,
      });

      const { container } = render(<App />);
      expect(container.querySelector(".header-identity-name")).toBeNull();
      expect(container.textContent).not.toContain("Nawaphon Isarathanachaikul");
      expect(container.querySelector("footer")).toBeNull();
    });
  });
});

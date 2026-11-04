import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
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

describe("App component orchestration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("lifecycle views", () => {
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
        (btn) => btn.getAttribute("aria-label")?.includes("Theme toggle"),
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

    it("opens zoom dialog on image click and closes on dismiss", async () => {
      mockResumeDataState();
      const { container } = render(<App />);

      const logoBtn = container.querySelector<HTMLButtonElement>(
        'button[aria-label*="PSU logo"]',
      );
      expect(logoBtn).not.toBeNull();
      if (logoBtn) fireEvent.click(logoBtn);

      const closeBtn = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Close logo preview"]',
      );
      expect(closeBtn).not.toBeNull();
      if (closeBtn) fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(container.querySelector('[role="dialog"]')).toBeNull();
      });
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
  });

  describe("header and footer identity states", () => {
    it("does not show static name or identity in header/footer when loading", () => {
      mockResumeDataState({
        profile: undefined,
        isLoading: true,
        progress: 50,
      });

      const { container } = render(<App />);
      const headerHeading = container.querySelector("header h1");
      expect(headerHeading?.textContent).toBe("");
      expect(container.textContent).not.toContain("Nawaphon Isarathanachaikul");
    });

    it("does not show static name or identity in header/footer when in error state", () => {
      mockResumeDataState({
        profile: undefined,
        isLoading: false,
        hasError: true,
      });

      const { container } = render(<App />);
      const errorHeaderHeading = container.querySelector("header h1");
      expect(errorHeaderHeading?.textContent).toBe("");
      expect(container.textContent).not.toContain("Nawaphon Isarathanachaikul");
    });
  });
});

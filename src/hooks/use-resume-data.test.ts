import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useResumeData } from "./use-resume-data";
import {
  resumeData as defaultResumeData,
  type ResumeEducation,
  type ResumeExperience,
} from "../resume-data";

const mockExperience: ResumeExperience = {
  role: "Developer",
  company: "Company",
  companyLogo: { src: "logo.png", width: 100, height: 100, surface: "light" },
  location: "Bangkok",
  period: "2024",
  employmentTypes: ["Contract"],
  highlights: ["Highlights"],
  technologies: ["TypeScript"],
};

const mockEducation: ResumeEducation = {
  degree: "B.Eng",
  institution: "PSU",
  institutionLogo: {
    src: "psu.png",
    width: 100,
    height: 100,
    surface: "light",
  },
  period: "2015-2019",
  gpax: "2.55",
  seniorProject: { name: "Project", url: "https://github.com" },
};

const defaultDataMap: Record<string, unknown> = {
  "/names": "Nawaphon Isarathanachaikul",
  "/titles": "Software Engineer",
  "/summaries": ["Passionate engineer."],
  "/details": defaultResumeData.details,
  "/links": defaultResumeData.links,
  "/skills": ["Go", "React", "TypeScript"],
  "/experiences": [mockExperience],
  "/educations": mockEducation,
};

function createMockFetch(dataOverrides: Record<string, unknown> = {}) {
  const dataMap: Record<string, unknown> = {
    ...defaultDataMap,
    ...dataOverrides,
  };

  return vi.fn().mockImplementation((url: string) => {
    const matchKey = Object.keys(dataMap).find((key) => url.includes(key));
    const data = matchKey ? dataMap[matchKey] : undefined;

    if (data === "FAIL_500") {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () =>
        Promise.resolve({
          data,
          success: true,
          timestamp: "2026-11-04T00:00:00Z",
        }),
    });
  });
}

const raceResourceMap: Record<string, unknown> = {
  "/titles": "Software Engineer",
  "/summaries": defaultDataMap["/summaries"],
  "/details": defaultResumeData.details,
  "/links": defaultResumeData.links,
  "/skills": ["Go", "React"],
  "/experiences": [mockExperience],
  "/educations": mockEducation,
};

function resolveRaceResourceData(url: string, currentCall: number): unknown {
  if (url.includes("/names")) {
    return `Name-Attempt-${String(currentCall)}`;
  }
  const match = Object.keys(raceResourceMap).find((k) => url.includes(k));
  return match ? raceResourceMap[match] : defaultDataMap["/summaries"];
}

function createRaceMockFetch(fetchResolvers: Array<() => void>) {
  let callCount = 0;
  return vi.fn().mockImplementation((url: string) => {
    const currentCall = ++callCount;
    const data = resolveRaceResourceData(url, currentCall);
    return new Promise((resolve) => {
      fetchResolvers.push(() => {
        resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: () =>
            Promise.resolve({
              data,
              success: true,
              timestamp: "2026-11-04T00:00:00Z",
            }),
        });
      });
    });
  });
}

describe("useResumeData hook orchestration", () => {
  describe("lifecycle orchestration and reload", () => {
    it("loads profile and reaches 100% progress on successful fetch", async () => {
      const mockFetch = createMockFetch();
      const { result } = renderHook(() =>
        useResumeData({ fetchFn: mockFetch as unknown as typeof fetch }),
      );

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile?.name).toBe("Nawaphon Isarathanachaikul");
      expect(result.current.progress).toBe(100);
      expect(result.current.hasError).toBe(false);
      expect(result.current.isFallback).toBe(false);
    });

    it("falls back to defaultResumeData with isFallback: true when fetch fails by default", async () => {
      const mockFetch = createMockFetch({ "/names": "FAIL_500" });
      const { result } = renderHook(() =>
        useResumeData({
          fetchFn: mockFetch as unknown as typeof fetch,
          retryDelayMs: 1,
          maxRetries: 0,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual(defaultResumeData);
      expect(result.current.isFallback).toBe(true);
      expect(result.current.hasError).toBe(false);
    });

    it("sets hasError: true and leaves profile undefined when useFallback is false", async () => {
      const mockFetch = createMockFetch({ "/names": "FAIL_500" });
      const { result } = renderHook(() =>
        useResumeData({
          fetchFn: mockFetch as unknown as typeof fetch,
          useFallback: false,
          retryDelayMs: 1,
          maxRetries: 0,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toBeUndefined();
      expect(result.current.isFallback).toBe(false);
      expect(result.current.hasError).toBe(true);
    });

    it("does not fetch initially when autoFetch: false until reloadAll() is invoked", async () => {
      const mockFetch = createMockFetch();
      const { result } = renderHook(() =>
        useResumeData({
          fetchFn: mockFetch as unknown as typeof fetch,
          autoFetch: false,
        }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();

      act(() => {
        result.current.reloadAll();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile?.name).toBe("Nawaphon Isarathanachaikul");
      expect(result.current.progress).toBe(100);
    });

    it("restarts fetching and updates profile when reloadAll() is triggered", async () => {
      let nameValue = "Initial Name";
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        const matchKey = Object.keys(defaultDataMap).find((key) =>
          url.includes(key),
        );
        const data = url.includes("/names")
          ? nameValue
          : matchKey
            ? defaultDataMap[matchKey]
            : undefined;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: () =>
            Promise.resolve({
              data,
              success: true,
              timestamp: "2026-11-04T00:00:00Z",
            }),
        });
      });

      const { result } = renderHook(() =>
        useResumeData({ fetchFn: mockFetch as unknown as typeof fetch }),
      );

      await waitFor(() => {
        expect(result.current.profile?.name).toBe("Initial Name");
      });

      nameValue = "Updated Name";
      act(() => {
        result.current.reloadAll();
      });

      await waitFor(() => {
        expect(result.current.profile?.name).toBe("Updated Name");
      });
    });

    it("aborts in-flight requests and avoids state updates after unmount", () => {
      let abortedSignal: AbortSignal | undefined;

      const mockFetch = vi
        .fn()
        .mockImplementation((_url: string, init?: RequestInit) => {
          abortedSignal = init?.signal as AbortSignal;
          return new Promise(() => {});
        });

      const { unmount } = renderHook(() =>
        useResumeData({ fetchFn: mockFetch as unknown as typeof fetch }),
      );

      expect(abortedSignal?.aborted).toBe(false);
      unmount();
      expect(abortedSignal?.aborted).toBe(true);
    });
  });

  describe("progress tracking and validation fallback", () => {
    it("updates progress incrementally to intermediate 12.5% and 50% as resources resolve", async () => {
      const resolvers: Record<string, (value: unknown) => void> = {};

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        const endpoint = Object.keys(defaultDataMap).find((key) =>
          url.includes(key),
        );
        return new Promise((resolve) => {
          if (endpoint) {
            resolvers[endpoint] = () => {
              resolve({
                ok: true,
                status: 200,
                statusText: "OK",
                json: () =>
                  Promise.resolve({
                    data: defaultDataMap[endpoint],
                    success: true,
                    timestamp: "2026-11-04T00:00:00Z",
                  }),
              });
            };
          }
        });
      });

      const { result } = renderHook(() =>
        useResumeData({ fetchFn: mockFetch as unknown as typeof fetch }),
      );

      expect(result.current.progress).toBe(0);

      // 1 of 8 resolved -> 12.5%
      act(() => {
        resolvers["/names"](undefined);
      });
      await waitFor(() => {
        expect(result.current.progress).toBe(12.5);
      });

      // 3 more resolved (4 total of 8) -> 50%
      act(() => {
        for (const key of ["/titles", "/summaries", "/details"]) {
          resolvers[key](undefined);
        }
      });
      await waitFor(() => {
        expect(result.current.progress).toBe(50);
      });

      // Resolve remaining 4
      act(() => {
        for (const key of [
          "/links",
          "/skills",
          "/experiences",
          "/educations",
        ]) {
          resolvers[key](undefined);
        }
      });
      await waitFor(() => {
        expect(result.current.progress).toBe(100);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("handles stale reload race conditions by ensuring latest reload wins", async () => {
      const fetchResolvers: Array<() => void> = [];
      const mockFetch = createRaceMockFetch(fetchResolvers);

      const { result } = renderHook(() =>
        useResumeData({ fetchFn: mockFetch as unknown as typeof fetch }),
      );

      expect(fetchResolvers.length).toBe(8);

      act(() => {
        result.current.reloadAll();
      });

      expect(fetchResolvers.length).toBe(16);

      // Finish second batch (items 8 to 15)
      act(() => {
        for (let i = 8; i < 16; i++) {
          fetchResolvers[i]?.();
        }
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Finish first batch later (simulating delayed arrival)
      await act(async () => {
        for (let i = 0; i < 8; i++) {
          fetchResolvers[i]?.();
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(result.current.profile?.name).toBe("Name-Attempt-9");
    });

    it("falls back cleanly without hanging in loading state when an endpoint returns null data", async () => {
      const mockFetch = createMockFetch({
        "/summaries": null,
      });

      const { result } = renderHook(() =>
        useResumeData({
          fetchFn: mockFetch as unknown as typeof fetch,
          maxRetries: 0,
          useFallback: true,
        }),
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isFallback).toBe(true);
      expect(result.current.hasError).toBe(false);
      expect(result.current.profile).toEqual(defaultResumeData);
    });

    it("transitions to error state without fallback when an endpoint returns invalid shape and fallback is disabled", async () => {
      const mockFetch = createMockFetch({
        "/details": "invalid-details-string",
      });

      const { result } = renderHook(() =>
        useResumeData({
          fetchFn: mockFetch as unknown as typeof fetch,
          maxRetries: 0,
          useFallback: false,
        }),
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.isFallback).toBe(false);
      expect(result.current.profile).toBeUndefined();
      expect(result.current.error).toBeDefined();
    });

    it("falls back to defaultResumeData when experiences payload is missing companyLogo", async () => {
      const invalidExp = { ...mockExperience, companyLogo: undefined };
      const mockFetch = createMockFetch({
        "/experiences": [invalidExp],
      });

      const { result } = renderHook(() =>
        useResumeData({
          fetchFn: mockFetch as unknown as typeof fetch,
          maxRetries: 0,
          useFallback: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isFallback).toBe(true);
      expect(result.current.profile).toEqual(defaultResumeData);
    });
  });
});

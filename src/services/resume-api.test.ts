import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RESUME_API_BASE_URL,
  DEFAULT_RESUME_API_RETRY_COUNT,
  DEFAULT_RESUME_API_RETRY_DELAY_MS,
  DEFAULT_RESUME_API_RETRY_DELAY_MULTIPLIER,
  DEFAULT_RESUME_API_RETRY_JITTER_MS,
  RESUME_API_ENDPOINTS,
  RESUME_API_HEADER_NAME,
  RESUME_API_HEADER_VALUE,
  ResumeApiError,
  buildResumeApiUrl,
  calculateBackoffDelay,
  fetchAllResumeData,
  fetchResumeDetails,
  fetchResumeEducations,
  fetchResumeExperiences,
  fetchResumeLinks,
  fetchResumeNames,
  fetchResumeSkills,
  fetchResumeSummaries,
  fetchResumeTitles,
  fetchResumeApi,
  getConfiguredResumeApiBaseUrl,
  isTransientError,
} from "./resume-api";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resume-api configuration & helpers", () => {
  it("provides expected defaults for all retry configuration constants", () => {
    expect(DEFAULT_RESUME_API_BASE_URL).toBe("");
    expect(DEFAULT_RESUME_API_RETRY_COUNT).toBe(3);
    expect(DEFAULT_RESUME_API_RETRY_DELAY_MS).toBe(1000);
    expect(DEFAULT_RESUME_API_RETRY_DELAY_MULTIPLIER).toBe(2);
    expect(DEFAULT_RESUME_API_RETRY_JITTER_MS).toBe(0);
    expect(RESUME_API_HEADER_NAME).toBe("X-Api-Type");
    expect(RESUME_API_HEADER_VALUE).toBe("resume-data");
  });

  it("defaults to same-origin API routes when no Vite base URL is configured", () => {
    vi.stubEnv("VITE_RESUME_API_BASE_URL", "");
    expect(getConfiguredResumeApiBaseUrl()).toBe("");
  });

  it("defines the 8 pluralized REST endpoints", () => {
    expect(RESUME_API_ENDPOINTS.names).toBe("/api/v1/names");
    expect(RESUME_API_ENDPOINTS.titles).toBe("/api/v1/titles");
    expect(RESUME_API_ENDPOINTS.summaries).toBe("/api/v1/summaries");
    expect(RESUME_API_ENDPOINTS.details).toBe("/api/v1/details");
    expect(RESUME_API_ENDPOINTS.links).toBe("/api/v1/links");
    expect(RESUME_API_ENDPOINTS.skills).toBe("/api/v1/skills");
    expect(RESUME_API_ENDPOINTS.experiences).toBe("/api/v1/experiences");
    expect(RESUME_API_ENDPOINTS.educations).toBe("/api/v1/educations");
  });

  describe("buildResumeApiUrl", () => {
    it("builds correct URL without retry parameter on attempt 0", () => {
      expect(buildResumeApiUrl("", "/api/v1/names", 0)).toBe("/api/v1/names");
      expect(
        buildResumeApiUrl("https://api.example.com", "/api/v1/names", 0),
      ).toBe("https://api.example.com/api/v1/names");
      expect(
        buildResumeApiUrl("https://api.example.com/", "api/v1/names", 0),
      ).toBe("https://api.example.com/api/v1/names");
    });

    it("appends ?retry={attempt} on attempt > 0", () => {
      expect(buildResumeApiUrl("", "/api/v1/names", 1)).toBe(
        "/api/v1/names?retry=1",
      );
      expect(
        buildResumeApiUrl("https://api.example.com", "/api/v1/names", 2),
      ).toBe("https://api.example.com/api/v1/names?retry=2");
    });

    it("appends &retry={attempt} when URL already contains query parameters", () => {
      expect(buildResumeApiUrl("", "/api/v1/names?filter=active", 1)).toBe(
        "/api/v1/names?filter=active&retry=1",
      );
    });
  });

  describe("calculateBackoffDelay", () => {
    const config = {
      baseDelayMs: 1000,
      multiplier: 2,
      jitterMs: 50,
    };

    it("calculates exponential delay with jitter", () => {
      expect(calculateBackoffDelay(1, config)).toBe(1050); // 1000 * 2^0 + 50
      expect(calculateBackoffDelay(2, config)).toBe(2050); // 1000 * 2^1 + 50
      expect(calculateBackoffDelay(3, config)).toBe(4050); // 1000 * 2^2 + 50
    });
  });

  describe("isTransientError", () => {
    it("identifies network errors and 5xx as transient", () => {
      expect(isTransientError(new ResumeApiError(0, "Network Error"))).toBe(
        true,
      );
      expect(
        isTransientError(new ResumeApiError(500, "Internal Server Error")),
      ).toBe(true);
      expect(
        isTransientError(new ResumeApiError(503, "Service Unavailable")),
      ).toBe(true);
      expect(isTransientError(new TypeError("Failed to fetch"))).toBe(true);
    });

    it("identifies 4xx errors and AbortError as non-transient", () => {
      expect(isTransientError(new ResumeApiError(400, "Bad Request"))).toBe(
        false,
      );
      expect(isTransientError(new ResumeApiError(404, "Not Found"))).toBe(
        false,
      );
      const abortError = new DOMException(
        "The user aborted a request.",
        "AbortError",
      );
      expect(isTransientError(abortError)).toBe(false);
    });
  });
});

describe("fetchResumeApi and endpoint methods", () => {
  describe("request execution and retry behavior", () => {
    it("uses the optional Vite API base URL by default", async () => {
      vi.stubEnv("VITE_RESUME_API_BASE_URL", "https://api.example.com/");
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () =>
          Promise.resolve({
            data: "Nawaphon Isarathanachaikul",
            success: true,
            timestamp: "2026-11-04T00:00:00Z",
          }),
      });

      await fetchResumeNames({
        fetchFn: mockFetch as unknown as typeof fetch,
        maxRetries: 0,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/api/v1/names",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("includes X-Api-Type header and unwraps ApiResponse envelope", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () =>
          Promise.resolve({
            data: "Nawaphon Isarathanachaikul",
            success: true,
            timestamp: "2026-11-04T00:00:00Z",
          }),
      });

      const result = await fetchResumeNames({
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(result).toBe("Nawaphon Isarathanachaikul");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/names",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "X-Api-Type": "resume-data",
          }) as Record<string, string>,
        }),
      );
    });

    it("retries on transient 500 error up to maxRetries with exponential retry query param", async () => {
      let callCount = 0;
      const requestedUrls: string[] = [];

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        callCount += 1;
        requestedUrls.push(url);
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: "Service Unavailable",
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: () =>
            Promise.resolve({
              data: "Backend Software Engineer",
              success: true,
              timestamp: "2026-11-04T00:00:00Z",
            }),
        });
      });

      const result = await fetchResumeTitles({
        fetchFn: mockFetch as unknown as typeof fetch,
        retryDelayMs: 1,
        maxRetries: 3,
      });

      expect(result).toBe("Backend Software Engineer");
      expect(callCount).toBe(3);
      expect(requestedUrls).toEqual([
        "/api/v1/titles",
        "/api/v1/titles?retry=1",
        "/api/v1/titles?retry=2",
      ]);
    });

    it("fails immediately without retrying on 4xx error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(
        fetchResumeApi("/api/v1/invalid", {
          fetchFn: mockFetch as unknown as typeof fetch,
          retryDelayMs: 1,
          maxRetries: 3,
        }),
      ).rejects.toThrow("Resume API request failed with status 404: Not Found");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("fails immediately without retrying when 200 response contains invalid JSON", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () =>
          Promise.reject(
            new SyntaxError(
              "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON",
            ),
          ),
      });

      await expect(
        fetchResumeApi("/api/v1/names", {
          fetchFn: mockFetch as unknown as typeof fetch,
          retryDelayMs: 1,
          maxRetries: 3,
        }),
      ).rejects.toThrow("Invalid JSON response from /api/v1/names");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("throws when max retries are exceeded", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(
        fetchResumeApi("/api/v1/names", {
          fetchFn: mockFetch as unknown as typeof fetch,
          retryDelayMs: 1,
          maxRetries: 2,
        }),
      ).rejects.toThrow(
        "Resume API request failed with status 500: Internal Server Error",
      );

      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it("respects AbortSignal and aborts immediately", async () => {
      const controller = new AbortController();
      controller.abort();

      const mockFetch = vi.fn();

      await expect(
        fetchResumeApi("/api/v1/names", {
          fetchFn: mockFetch as unknown as typeof fetch,
          signal: controller.signal,
        }),
      ).rejects.toThrow();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("profile aggregation and resource fetching", () => {
    const mockResourceDataMap: Record<string, unknown> = {
      "/names": "Nawaphon",
      "/titles": "Software Engineer",
      "/summaries": ["Summary line"],
      "/details": {
        location: "Bangkok",
        phoneLabel: "Available on request",
        email: "nawaphon2539@gmail.com",
        nationality: "Thai",
        birthDate: "9 September 1996",
      },
      "/links": [{ label: "GitHub", url: "https://github.com/nawaphonOHM" }],
      "/skills": ["Go", "React"],
      "/experiences": [
        {
          role: "Engineer",
          company: "Company",
          companyLogo: {
            src: "logo.png",
            width: 100,
            height: 100,
            surface: "light",
          },
          location: "Bangkok",
          period: "2024",
          employmentTypes: ["Contract"],
          highlights: ["Highlight"],
          technologies: ["Go"],
        },
      ],
      "/educations": {
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
        seniorProject: { name: "CoE", url: "https://github.com" },
      },
    };

    function createMockResourceFetch() {
      return vi.fn().mockImplementation((url: string) => {
        const match = Object.keys(mockResourceDataMap).find((k) =>
          url.includes(k),
        );
        const data = match ? mockResourceDataMap[match] : undefined;
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

    it("fetchAllResumeData fetches all 8 resources concurrently and constructs ResumeProfile", async () => {
      const mockFetch = createMockResourceFetch();
      const profile = await fetchAllResumeData({
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(profile).toMatchObject({
        name: "Nawaphon",
        title: "Software Engineer",
        summary: ["Summary line"],
        details: { email: "nawaphon2539@gmail.com" },
        skills: ["Go", "React"],
        education: { degree: "B.Eng" },
      });
      expect(profile.links).toHaveLength(1);
      expect(profile.experience).toHaveLength(1);
    });

    function verifyResourceResults(
      profileParts: [
        string,
        string,
        readonly string[],
        { location: string },
        readonly unknown[],
        readonly string[],
        readonly unknown[],
        { degree: string },
      ],
    ) {
      const [
        name,
        title,
        summaries,
        details,
        links,
        skills,
        experiences,
        educations,
      ] = profileParts;
      expect(name).toBe("Nawaphon");
      expect(title).toBe("Software Engineer");
      expect(summaries).toEqual(["Summary line"]);
      expect(details.location).toBe("Bangkok");
      expect(links).toHaveLength(1);
      expect(skills).toEqual(["Go", "React"]);
      expect(experiences).toHaveLength(1);
      expect(educations.degree).toBe("B.Eng");
    }

    it("supports individual resource helper methods", async () => {
      const mockFetch = createMockResourceFetch();
      const options = { fetchFn: mockFetch as unknown as typeof fetch };

      const results = await Promise.all([
        fetchResumeNames(options),
        fetchResumeTitles(options),
        fetchResumeSummaries(options),
        fetchResumeDetails(options),
        fetchResumeLinks(options),
        fetchResumeSkills(options),
        fetchResumeExperiences(options),
        fetchResumeEducations(options),
      ]);

      verifyResourceResults(results);
    });
  });
});

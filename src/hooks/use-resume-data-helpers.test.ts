import { describe, expect, it, vi } from "vitest";
import {
  buildAggregatedProfile,
  fetchAllResources,
  fetchResourceItem,
  initialResumeDataState,
  resumeDataReducer,
  type FetchProgressContext,
  type ResumeDataState,
} from "./use-resume-data";
import type { ResumeEducation, ResumeExperience } from "../resume-data";
import { resumeProfile as defaultResumeData } from "../test-fixtures/resume-profile";

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

describe("resumeDataReducer", () => {
  const initialState: ResumeDataState = {
    profile: undefined,
    isLoading: true,
    hasError: false,
    error: undefined,
    progress: 0,
  };

  it("handles START_FETCH action", () => {
    const errorState: ResumeDataState = {
      profile: undefined,
      isLoading: false,
      hasError: true,
      error: new Error("Test"),
      progress: 50,
    };

    const nextState = resumeDataReducer(errorState, { type: "START_FETCH" });
    expect(nextState).toEqual({
      profile: undefined,
      isLoading: true,
      hasError: false,
      error: undefined,
      progress: 0,
    });
  });

  it("handles PROGRESS action and calculates percentage correctly", () => {
    expect(
      resumeDataReducer(initialState, { type: "PROGRESS", count: 2 }).progress,
    ).toBe(25);
    expect(
      resumeDataReducer(initialState, { type: "PROGRESS", count: 8 }).progress,
    ).toBe(100);
  });

  it("handles SUCCESS action", () => {
    const nextState = resumeDataReducer(initialState, {
      type: "SUCCESS",
      profile: defaultResumeData,
    });

    expect(nextState).toEqual({
      profile: defaultResumeData,
      isLoading: false,
      hasError: false,
      error: undefined,
      progress: 100,
    });
  });

  it("handles ERROR action without an embedded profile", () => {
    const error = new Error("Fatal network error");
    const stateWithoutFallback = resumeDataReducer(initialState, {
      type: "ERROR",
      error,
    });

    expect(stateWithoutFallback).toEqual({
      profile: undefined,
      isLoading: false,
      hasError: true,
      error,
      progress: 0,
    });
  });
});

describe("initialResumeDataState", () => {
  it("initializes isLoading based on autoFetch flag", () => {
    expect(initialResumeDataState(true).isLoading).toBe(true);
    expect(initialResumeDataState(undefined).isLoading).toBe(true);
    expect(initialResumeDataState(false).isLoading).toBe(false);
  });
});

describe("buildAggregatedProfile", () => {
  it("returns full ResumeProfile when all 8 parts are present", () => {
    const profile = buildAggregatedProfile([
      "Nawaphon",
      "Software Engineer",
      ["Summary"],
      defaultResumeData.details,
      defaultResumeData.links,
      ["Skill A"],
      [mockExperience],
      mockEducation,
    ]);

    expect(profile).toBeDefined();
    expect(profile?.name).toBe("Nawaphon");
    expect(profile?.title).toBe("Software Engineer");
  });

  it("normalizes link, company, client, and institution logos to flat assets", () => {
    const image = (src: string) => ({
      src,
      width: 100,
      height: 100,
      surface: "light" as const,
    });
    const profile = buildAggregatedProfile([
      "Nawaphon",
      "Software Engineer",
      ["Summary"],
      defaultResumeData.details,
      [
        {
          label: "GitHub",
          url: "https://github.com",
          logo: image("/link-logos/github.svg"),
        },
      ],
      ["Skill A"],
      [
        {
          ...mockExperience,
          companyLogo: image("/company-logos/wisesoft.png"),
          client: {
            name: "InnovestX",
            logo: image("https://ohm-mho.space/company-logos/innovestx.png"),
          },
        },
      ],
      {
        ...mockEducation,
        institutionLogo: image(
          "/university-logos/prince-of-songkla-university.webp",
        ),
      },
    ]);

    expect(profile?.links[0].logo?.src).toBe(
      "https://ohm-mho.space/assets/github.svg",
    );
    expect(profile?.experience[0].companyLogo.src).toBe(
      "https://ohm-mho.space/assets/wisesoft.png",
    );
    expect(profile?.experience[0].client?.logo.src).toBe(
      "https://ohm-mho.space/assets/innovestx.png",
    );
    expect(profile?.education.institutionLogo.src).toBe(
      "https://ohm-mho.space/assets/prince-of-songkla-university.webp",
    );
  });

  it("returns undefined if any of the 8 parts is undefined", () => {
    const profile = buildAggregatedProfile([
      "Nawaphon",
      undefined,
      ["Summary"],
      defaultResumeData.details,
      defaultResumeData.links,
      ["Skill A"],
      [mockExperience],
      mockEducation,
    ]);

    expect(profile).toBeUndefined();
  });

  it("returns undefined if any of the 8 parts has an invalid shape", () => {
    // summaries is not an array
    expect(
      buildAggregatedProfile([
        "Nawaphon",
        "Engineer",
        "not-an-array" as unknown as readonly string[],
        defaultResumeData.details,
        defaultResumeData.links,
        ["Skill A"],
        [mockExperience],
        mockEducation,
      ]),
    ).toBeUndefined();

    // details is null
    expect(
      buildAggregatedProfile([
        "Nawaphon",
        "Engineer",
        ["Summary"],
        null as unknown as typeof defaultResumeData.details,
        defaultResumeData.links,
        ["Skill A"],
        [mockExperience],
        mockEducation,
      ]),
    ).toBeUndefined();

    // education is null
    expect(
      buildAggregatedProfile([
        "Nawaphon",
        "Engineer",
        ["Summary"],
        defaultResumeData.details,
        defaultResumeData.links,
        ["Skill A"],
        [mockExperience],
        null as unknown as typeof mockEducation,
      ]),
    ).toBeUndefined();
  });
});

describe("buildAggregatedProfile privacy", () => {
  it("keeps phone output at Available on request when the API provides a number", () => {
    const profile = buildAggregatedProfile([
      "Nawaphon",
      "Software Engineer",
      ["Summary"],
      { ...defaultResumeData.details, phoneLabel: "+66 81 234 5678" },
      [],
      [],
      [mockExperience],
      mockEducation,
    ]);

    expect(profile?.details.phoneLabel).toBe("Available on request");
  });
});

describe("fetchResourceItem & fetchAllResources", () => {
  it("fetchResourceItem reports progress and returns data on success", async () => {
    const onProgress = vi.fn();
    const onError = vi.fn();
    const ctx: FetchProgressContext = {
      signal: new AbortController().signal,
      onProgress,
      onError,
    };

    const data = await fetchResourceItem(() => Promise.resolve("Sample"), ctx);
    expect(data).toBe("Sample");
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("fetchResourceItem captures error and returns undefined on failure", async () => {
    const onProgress = vi.fn();
    const onError = vi.fn();
    const ctx: FetchProgressContext = {
      signal: new AbortController().signal,
      onProgress,
      onError,
    };

    const testError = new Error("Fetch failed");
    const failingFetcher = (): Promise<string> => Promise.reject(testError);
    const data = await fetchResourceItem<string>(failingFetcher, ctx);

    expect(data).toBeUndefined();
    expect(onProgress).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(testError);
  });

  it("fetchAllResources aggregates all 8 endpoints and tracks progress", async () => {
    const mockResponses: Record<string, unknown> = {
      "/names": "ok",
      "/titles": "Title",
      "/summaries": ["item"],
      "/details": defaultResumeData.details,
      "/links": defaultResumeData.links,
      "/skills": ["item"],
      "/experiences": [mockExperience],
      "/educations": mockEducation,
    };

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      const match = Object.keys(mockResponses).find((k) => url.includes(k));
      const data = match ? mockResponses[match] : "ok";
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

    let progressCalls = 0;
    const ctx: FetchProgressContext = {
      signal: new AbortController().signal,
      onProgress: () => {
        progressCalls += 1;
      },
      onError: vi.fn(),
    };

    const profile = await fetchAllResources({ fetchFn: mockFetch }, ctx);

    expect(profile).toBeDefined();
    expect(progressCalls).toBe(8);
    expect(profile?.name).toBe("ok");
    expect(profile?.experience).toHaveLength(1);
  });

  it("fetchAllResources returns undefined when signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const ctx: FetchProgressContext = {
      signal: controller.signal,
      onProgress: vi.fn(),
      onError: vi.fn(),
    };

    const profile = await fetchAllResources({}, ctx);
    expect(profile).toBeUndefined();
  });
});

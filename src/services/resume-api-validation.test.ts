import { describe, expect, it, vi } from "vitest";
import {
  fetchResumeDetails,
  fetchResumeEducations,
  fetchResumeExperiences,
  fetchResumeLinks,
  fetchResumeNames,
  fetchResumeSkills,
  fetchResumeSummaries,
  fetchResumeTitles,
} from "./resume-api";

function mockFetchWithData(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () =>
      Promise.resolve({
        data,
        success: true,
        timestamp: "2026-11-04T00:00:00Z",
      }),
  }) as unknown as typeof fetch;
}

const validExperience = {
  role: "Software Engineer",
  company: "Tech Corp",
  companyLogo: { src: "corp.png", width: 100, height: 100, surface: "light" },
  location: "Bangkok",
  period: "2023 - Present",
  employmentTypes: ["Full-time"],
  highlights: ["Engineered core backend APIs."],
  technologies: ["Go", "Kafka"],
};

const validEducation = {
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
  seniorProject: { name: "Senior Project", url: "https://github.com" },
};

describe("resume-api primitive and array shape validation", () => {
  it("throws ResumeApiError on non-string names and titles response", async () => {
    await expect(
      fetchResumeNames({ fetchFn: mockFetchWithData(123) }),
    ).rejects.toThrow("Invalid names response shape");
    await expect(
      fetchResumeNames({ fetchFn: mockFetchWithData(null) }),
    ).rejects.toThrow("Invalid names response shape");
    await expect(
      fetchResumeTitles({ fetchFn: mockFetchWithData(null) }),
    ).rejects.toThrow("Invalid titles response shape");
  });

  it("throws ResumeApiError on non-array or invalid summaries response", async () => {
    await expect(
      fetchResumeSummaries({ fetchFn: mockFetchWithData("not-an-array") }),
    ).rejects.toThrow("Invalid summaries response shape");
    await expect(
      fetchResumeSummaries({ fetchFn: mockFetchWithData([1, 2, 3]) }),
    ).rejects.toThrow("Invalid summaries response shape");
  });

  it("throws ResumeApiError on invalid details response", async () => {
    await expect(
      fetchResumeDetails({ fetchFn: mockFetchWithData(null) }),
    ).rejects.toThrow("Invalid details response shape");
    await expect(
      fetchResumeDetails({
        fetchFn: mockFetchWithData({ location: "Bangkok" }),
      }),
    ).rejects.toThrow("Invalid details response shape");
  });

  it("throws ResumeApiError on invalid skills response", async () => {
    await expect(
      fetchResumeSkills({ fetchFn: mockFetchWithData(null) }),
    ).rejects.toThrow("Invalid skills response shape");
    await expect(
      fetchResumeSkills({ fetchFn: mockFetchWithData(["Go", 123]) }),
    ).rejects.toThrow("Invalid skills response shape");
  });
});

describe("resume-api links shape validation", () => {
  it("accepts valid links with and without optional logo", async () => {
    const validLinks = [
      { label: "GitHub", url: "https://github.com" },
      {
        label: "Site",
        url: "https://example.com",
        logo: { src: "site.svg", width: 24, height: 24, surface: "dark" },
      },
    ];
    const result = await fetchResumeLinks({
      fetchFn: mockFetchWithData(validLinks),
    });
    expect(result).toHaveLength(2);
  });

  it("throws on malformed links or malformed link logos", async () => {
    await expect(
      fetchResumeLinks({ fetchFn: mockFetchWithData("not-an-array") }),
    ).rejects.toThrow("Invalid links response shape");
    await expect(
      fetchResumeLinks({ fetchFn: mockFetchWithData([{ label: "only" }]) }),
    ).rejects.toThrow("Invalid links response shape");
    await expect(
      fetchResumeLinks({
        fetchFn: mockFetchWithData([
          { label: "GitHub", url: "https://github.com", logo: { src: 123 } },
        ]),
      }),
    ).rejects.toThrow("Invalid links response shape");
  });
});

describe("resume-api experiences shape validation", () => {
  it("accepts valid experience items including optional client", async () => {
    const withClient = {
      ...validExperience,
      client: {
        name: "FinTech Client",
        logo: { src: "client.svg", width: 40, height: 40, surface: "dark" },
      },
    };
    const result = await fetchResumeExperiences({
      fetchFn: mockFetchWithData([validExperience, withClient]),
    });
    expect(result).toHaveLength(2);
  });

  it("throws when companyLogo is missing or malformed", async () => {
    const missingLogo = { ...validExperience, companyLogo: undefined };
    await expect(
      fetchResumeExperiences({ fetchFn: mockFetchWithData([missingLogo]) }),
    ).rejects.toThrow("Invalid experiences response shape");

    const badSurface = {
      ...validExperience,
      companyLogo: { src: "logo.png", width: 24, height: 24, surface: "blue" },
    };
    await expect(
      fetchResumeExperiences({ fetchFn: mockFetchWithData([badSurface]) }),
    ).rejects.toThrow("Invalid experiences response shape");
  });

  it("throws when client is malformed or missing logo", async () => {
    const badClient = {
      ...validExperience,
      client: { name: "Client Missing Logo" },
    };
    await expect(
      fetchResumeExperiences({ fetchFn: mockFetchWithData([badClient]) }),
    ).rejects.toThrow("Invalid experiences response shape");
  });

  it("throws when experience array fields contain non-string values", async () => {
    const badArray = {
      ...validExperience,
      employmentTypes: [123],
    };
    await expect(
      fetchResumeExperiences({ fetchFn: mockFetchWithData([badArray]) }),
    ).rejects.toThrow("Invalid experiences response shape");
  });
});

describe("resume-api educations shape validation", () => {
  it("accepts valid education item", async () => {
    const result = await fetchResumeEducations({
      fetchFn: mockFetchWithData(validEducation),
    });
    expect(result.degree).toBe("B.Eng");
  });

  it("throws when institutionLogo is missing or invalid", async () => {
    const missingLogo = { ...validEducation, institutionLogo: undefined };
    await expect(
      fetchResumeEducations({ fetchFn: mockFetchWithData(missingLogo) }),
    ).rejects.toThrow("Invalid educations response shape");
  });

  it("throws when seniorProject is missing or invalid", async () => {
    const missingProj = { ...validEducation, seniorProject: null };
    await expect(
      fetchResumeEducations({ fetchFn: mockFetchWithData(missingProj) }),
    ).rejects.toThrow("Invalid educations response shape");
  });
});

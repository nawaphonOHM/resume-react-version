import type {
  ClientCompany,
  ImageAsset,
  ResumeDetails,
  ResumeEducation,
  ResumeExperience,
  ResumeLink,
  ResumeProject,
} from "../resume-data";

export function isNonEmptyObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

export function isBrandLogo(value: unknown): value is ImageAsset {
  if (!isNonEmptyObject(value)) {
    return false;
  }
  return (
    typeof value.src === "string" &&
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    (value.surface === "light" || value.surface === "dark")
  );
}

export function isResumeClient(value: unknown): value is ClientCompany {
  if (!isNonEmptyObject(value)) {
    return false;
  }
  return typeof value.name === "string" && isBrandLogo(value.logo);
}

export function isResumeDetails(value: unknown): value is ResumeDetails {
  if (!isNonEmptyObject(value)) {
    return false;
  }
  return ["location", "phoneLabel", "email", "nationality", "birthDate"].every(
    (k) => typeof value[k] === "string",
  );
}

export function isResumeLink(item: unknown): item is ResumeLink {
  if (!isNonEmptyObject(item)) {
    return false;
  }
  const hasBasicProps =
    typeof item.label === "string" && typeof item.url === "string";
  const hasValidLogo = item.logo === undefined || isBrandLogo(item.logo);
  return hasBasicProps && hasValidLogo;
}

export function isResumeLinkArray(
  value: unknown,
): value is readonly ResumeLink[] {
  return Array.isArray(value) && value.every(isResumeLink);
}

export function hasExperienceArrays(item: Record<string, unknown>): boolean {
  return (
    isStringArray(item.employmentTypes) &&
    isStringArray(item.highlights) &&
    isStringArray(item.technologies)
  );
}

export function hasOptionalClient(item: Record<string, unknown>): boolean {
  return item.client === undefined || isResumeClient(item.client);
}

export function isResumeExperienceItem(
  item: unknown,
): item is ResumeExperience {
  if (!isNonEmptyObject(item)) {
    return false;
  }
  const hasStrings = ["role", "company", "location", "period"].every(
    (k) => typeof item[k] === "string",
  );
  return (
    hasStrings &&
    isBrandLogo(item.companyLogo) &&
    hasOptionalClient(item) &&
    hasExperienceArrays(item)
  );
}

export function isResumeExperienceArray(
  value: unknown,
): value is readonly ResumeExperience[] {
  return Array.isArray(value) && value.every(isResumeExperienceItem);
}

export function isResumeProject(proj: unknown): proj is ResumeProject {
  return (
    isNonEmptyObject(proj) &&
    typeof proj.name === "string" &&
    typeof proj.url === "string"
  );
}

export function isResumeEducation(value: unknown): value is ResumeEducation {
  if (!isNonEmptyObject(value)) {
    return false;
  }
  const hasStrings = ["degree", "institution", "period", "gpax"].every(
    (k) => typeof value[k] === "string",
  );
  return (
    hasStrings &&
    isResumeProject(value.seniorProject) &&
    isBrandLogo(value.institutionLogo)
  );
}

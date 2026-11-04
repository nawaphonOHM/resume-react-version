import { unwrapApiResponse } from "../types/api-response";
import type { ResumeProfile } from "../resume-data";
import {
  isResumeDetails,
  isResumeEducation,
  isResumeExperienceArray,
  isResumeLinkArray,
  isStringArray,
} from "./resume-api-validators";

export const DEFAULT_RESUME_API_BASE_URL = "";
export const DEFAULT_RESUME_API_RETRY_COUNT = 3;
export const DEFAULT_RESUME_API_RETRY_DELAY_MS = 1000;
export const DEFAULT_RESUME_API_RETRY_DELAY_MULTIPLIER = 2;
export const DEFAULT_RESUME_API_RETRY_JITTER_MS = 0;
export const RESUME_API_HEADER_NAME = "X-Api-Type";
export const RESUME_API_HEADER_VALUE = "resume-data";

export const RESUME_API_ENDPOINTS = {
  names: "/api/v1/names",
  titles: "/api/v1/titles",
  summaries: "/api/v1/summaries",
  details: "/api/v1/details",
  links: "/api/v1/links",
  skills: "/api/v1/skills",
  experiences: "/api/v1/experiences",
  educations: "/api/v1/educations",
} as const;

export interface ResumeApiOptions {
  readonly baseUrl?: string;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
  readonly retryDelayMultiplier?: number;
  readonly retryJitterMs?: number;
  readonly fetchFn?: typeof fetch;
  readonly signal?: AbortSignal;
  readonly headers?: Record<string, string>;
}

export interface RetryBackoffConfig {
  readonly baseDelayMs: number;
  readonly multiplier: number;
  readonly jitterMs: number;
}

export class ResumeApiError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string, message?: string) {
    super(
      message ??
        `Resume API request failed with status ${String(status)}: ${statusText}`,
    );
    this.name = "ResumeApiError";
    this.status = status;
    this.statusText = statusText;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export function isTransientError(error: unknown): boolean {
  if (isAbortError(error)) {
    return false;
  }
  if (error instanceof ResumeApiError) {
    return error.status === 0 || (error.status >= 500 && error.status < 600);
  }
  return true;
}

export function buildResumeApiUrl(
  baseUrl: string,
  endpoint: string,
  attempt: number,
): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  const fullPath = cleanBase ? `${cleanBase}/${cleanEndpoint}` : endpoint;
  if (attempt === 0) {
    return fullPath;
  }
  const separator = fullPath.includes("?") ? "&" : "?";
  return `${fullPath}${separator}retry=${String(attempt)}`;
}

export function calculateBackoffDelay(
  attempt: number,
  config: RetryBackoffConfig,
): number {
  const calculated =
    config.baseDelayMs * Math.pow(config.multiplier, attempt - 1) +
    config.jitterMs;
  return Math.max(0, calculated);
}

function delayWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        signal.reason instanceof Error
          ? signal.reason
          : new DOMException("Aborted", "AbortError"),
      );
      return;
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);
    const handleAbort = () => {
      clearTimeout(timer);
      reject(
        signal?.reason instanceof Error
          ? signal.reason
          : new DOMException("Aborted", "AbortError"),
      );
    };
    if (signal) signal.addEventListener("abort", handleAbort, { once: true });
  });
}

function checkAbortSignal(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException("Aborted", "AbortError");
  }
}

async function parseResponseJson(
  response: Response,
  url: string,
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ResumeApiError(
      response.status,
      response.statusText || "OK",
      `Invalid JSON response from ${url}`,
    );
  }
}

async function performFetchAttempt<T>(
  url: string,
  options: ResumeApiOptions,
): Promise<T> {
  checkAbortSignal(options.signal);

  const fetchFn = options.fetchFn ?? fetch;
  const response = await fetchFn(url, {
    method: "GET",
    headers: {
      [RESUME_API_HEADER_NAME]: RESUME_API_HEADER_VALUE,
      ...options.headers,
    },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new ResumeApiError(response.status, response.statusText);
  }

  const rawJson = await parseResponseJson(response, url);
  return unwrapApiResponse<T>(rawJson);
}

interface RetryCheckContext {
  readonly error: unknown;
  readonly attempt: number;
  readonly maxRetries: number;
  readonly signal?: AbortSignal;
}

function shouldRetryAttempt(ctx: RetryCheckContext): boolean {
  if (ctx.signal?.aborted || !isTransientError(ctx.error)) {
    return false;
  }
  return ctx.attempt < ctx.maxRetries;
}

interface ResolvedApiConfig {
  readonly maxRetries: number;
  readonly baseUrl: string;
  readonly backoff: RetryBackoffConfig;
}

function resolveApiConfig(options: ResumeApiOptions): ResolvedApiConfig {
  return {
    maxRetries: Math.max(
      0,
      options.maxRetries ?? DEFAULT_RESUME_API_RETRY_COUNT,
    ),
    baseUrl: options.baseUrl ?? DEFAULT_RESUME_API_BASE_URL,
    backoff: {
      baseDelayMs: options.retryDelayMs ?? DEFAULT_RESUME_API_RETRY_DELAY_MS,
      multiplier:
        options.retryDelayMultiplier ??
        DEFAULT_RESUME_API_RETRY_DELAY_MULTIPLIER,
      jitterMs: options.retryJitterMs ?? DEFAULT_RESUME_API_RETRY_JITTER_MS,
    },
  };
}

async function executeWithRetry<T>(
  endpoint: string,
  options: ResumeApiOptions,
  config: ResolvedApiConfig,
): Promise<T> {
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    const url = buildResumeApiUrl(config.baseUrl, endpoint, attempt);
    try {
      return await performFetchAttempt<T>(url, options);
    } catch (error: unknown) {
      const canRetry = shouldRetryAttempt({
        error,
        attempt,
        maxRetries: config.maxRetries,
        signal: options.signal,
      });
      if (!canRetry) {
        throw error;
      }
      const delay = calculateBackoffDelay(attempt + 1, config.backoff);
      await delayWithSignal(delay, options.signal);
    }
  }
  throw new ResumeApiError(0, "Retries exhausted");
}

export async function fetchResumeApi<T>(
  endpoint: string,
  options: ResumeApiOptions = {},
): Promise<T> {
  const config = resolveApiConfig(options);
  return executeWithRetry<T>(endpoint, options, config);
}

interface ValidatedFetchConfig<T> {
  endpoint: string;
  options?: ResumeApiOptions;
  isValid: (value: unknown) => value is T;
  typeName: string;
}

async function fetchValidatedResource<T>(
  config: ValidatedFetchConfig<T>,
): Promise<T> {
  const data = await fetchResumeApi<unknown>(config.endpoint, config.options);
  if (!config.isValid(data)) {
    throw new ResumeApiError(
      200,
      "OK",
      `Invalid ${config.typeName} response shape: expected ${config.typeName}, got ${typeof data}`,
    );
  }
  return data;
}

function createResourceFetcher<T>(
  endpoint: string,
  isValid: (value: unknown) => value is T,
  typeName: string,
): (options?: ResumeApiOptions) => Promise<T> {
  return (options) =>
    fetchValidatedResource({ endpoint, options, isValid, typeName });
}

export const fetchResumeNames = createResourceFetcher(
  RESUME_API_ENDPOINTS.names,
  (v): v is string => typeof v === "string",
  "names",
);
export const fetchResumeTitles = createResourceFetcher(
  RESUME_API_ENDPOINTS.titles,
  (v): v is string => typeof v === "string",
  "titles",
);
export const fetchResumeSummaries = createResourceFetcher(
  RESUME_API_ENDPOINTS.summaries,
  isStringArray,
  "summaries",
);
export const fetchResumeDetails = createResourceFetcher(
  RESUME_API_ENDPOINTS.details,
  isResumeDetails,
  "details",
);
export const fetchResumeLinks = createResourceFetcher(
  RESUME_API_ENDPOINTS.links,
  isResumeLinkArray,
  "links",
);
export const fetchResumeSkills = createResourceFetcher(
  RESUME_API_ENDPOINTS.skills,
  isStringArray,
  "skills",
);
export const fetchResumeExperiences = createResourceFetcher(
  RESUME_API_ENDPOINTS.experiences,
  isResumeExperienceArray,
  "experiences",
);
export const fetchResumeEducations = createResourceFetcher(
  RESUME_API_ENDPOINTS.educations,
  isResumeEducation,
  "educations",
);

export async function fetchAllResumeData(
  options?: ResumeApiOptions,
): Promise<ResumeProfile> {
  const [name, title, summary, details, links, skills, experience, education] =
    await Promise.all([
      fetchResumeNames(options),
      fetchResumeTitles(options),
      fetchResumeSummaries(options),
      fetchResumeDetails(options),
      fetchResumeLinks(options),
      fetchResumeSkills(options),
      fetchResumeExperiences(options),
      fetchResumeEducations(options),
    ]);

  return {
    name,
    title,
    summary: [...summary],
    details,
    links: [...links],
    skills: [...skills],
    experience: [...experience],
    education,
  };
}

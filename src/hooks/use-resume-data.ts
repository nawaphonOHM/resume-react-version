import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  fetchResumeDetails,
  fetchResumeEducations,
  fetchResumeExperiences,
  fetchResumeLinks,
  fetchResumeNames,
  fetchResumeSkills,
  fetchResumeSummaries,
  fetchResumeTitles,
  type ResumeApiOptions,
} from "../services/resume-api";
import {
  resumeData as defaultResumeData,
  type ResumeDetails,
  type ResumeEducation,
  type ResumeExperience,
  type ResumeLink,
  type ResumeProfile,
} from "../resume-data";

export interface UseResumeDataOptions extends ResumeApiOptions {
  readonly fallbackData?: ResumeProfile | null;
  readonly useFallback?: boolean;
  readonly autoFetch?: boolean;
}

export interface UseResumeDataResult {
  readonly profile: ResumeProfile | undefined;
  readonly isLoading: boolean;
  readonly hasError: boolean;
  readonly isFallback: boolean;
  readonly error: unknown;
  readonly progress: number;
  readonly reloadAll: () => void;
}

export interface FetchProgressContext {
  readonly signal: AbortSignal;
  readonly onProgress: () => void;
  readonly onError: (error: unknown) => void;
}

export interface ResumeDataState {
  readonly profile: ResumeProfile | undefined;
  readonly isLoading: boolean;
  readonly hasError: boolean;
  readonly isFallback: boolean;
  readonly error: unknown;
  readonly progress: number;
}

export type ResumeDataAction =
  | { type: "START_FETCH" }
  | { type: "PROGRESS"; count: number }
  | { type: "SUCCESS"; profile: ResumeProfile }
  | { type: "ERROR"; error: unknown; fallbackProfile?: ResumeProfile };

export function resumeDataReducer(
  state: ResumeDataState,
  action: ResumeDataAction,
): ResumeDataState {
  switch (action.type) {
    case "START_FETCH":
      return {
        profile: undefined,
        isLoading: true,
        hasError: false,
        isFallback: false,
        error: undefined,
        progress: 0,
      };
    case "PROGRESS":
      return {
        ...state,
        progress: (action.count / 8) * 100,
      };
    case "SUCCESS":
      return {
        profile: action.profile,
        isLoading: false,
        hasError: false,
        isFallback: false,
        error: undefined,
        progress: 100,
      };
    case "ERROR":
      return {
        profile: action.fallbackProfile,
        isLoading: false,
        hasError: action.fallbackProfile === undefined,
        isFallback: action.fallbackProfile !== undefined,
        error: action.error,
        progress: state.progress,
      };
    default:
      return state;
  }
}

export function initialResumeDataState(autoFetch?: boolean): ResumeDataState {
  return {
    profile: undefined,
    isLoading: autoFetch !== false,
    hasError: false,
    isFallback: false,
    error: undefined,
    progress: 0,
  };
}

export async function fetchResourceItem<T>(
  fetcher: () => Promise<T>,
  ctx: FetchProgressContext,
): Promise<T | undefined> {
  try {
    const data = await fetcher();
    if (ctx.signal.aborted) {
      return undefined;
    }
    ctx.onProgress();
    return data;
  } catch (error: unknown) {
    if (!ctx.signal.aborted) {
      ctx.onError(error);
    }
    return undefined;
  }
}

function hasValidProfileSlices(
  results: readonly unknown[],
): results is [
  string,
  string,
  readonly string[],
  ResumeDetails,
  readonly ResumeLink[],
  readonly string[],
  readonly ResumeExperience[],
  ResumeEducation,
] {
  const isComplete = results.every(
    (item) => item !== undefined && item !== null,
  );
  if (!isComplete) {
    return false;
  }
  const [, , summary, , links, skills, experience] = results;
  return (
    Array.isArray(summary) &&
    Array.isArray(links) &&
    Array.isArray(skills) &&
    Array.isArray(experience)
  );
}

export function buildAggregatedProfile(
  results: [
    string | undefined,
    string | undefined,
    readonly string[] | undefined,
    ResumeDetails | undefined,
    readonly ResumeLink[] | undefined,
    readonly string[] | undefined,
    readonly ResumeExperience[] | undefined,
    ResumeEducation | undefined,
  ],
): ResumeProfile | undefined {
  if (!hasValidProfileSlices(results)) {
    return undefined;
  }

  const [name, title, summary, details, links, skills, experience, education] =
    results;

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

export function resolveFallbackProfile(
  options: UseResumeDataOptions,
): ResumeProfile | undefined {
  if (options.fallbackData === null || options.useFallback === false) {
    return undefined;
  }
  if (options.fallbackData !== undefined) {
    return options.fallbackData;
  }
  return defaultResumeData;
}

export async function fetchAllResources(
  options: ResumeApiOptions,
  ctx: FetchProgressContext,
): Promise<ResumeProfile | undefined> {
  const requestOptions =
    options.signal === ctx.signal
      ? options
      : { ...options, signal: ctx.signal };

  const results = await Promise.all([
    fetchResourceItem(() => fetchResumeNames(requestOptions), ctx),
    fetchResourceItem(() => fetchResumeTitles(requestOptions), ctx),
    fetchResourceItem(() => fetchResumeSummaries(requestOptions), ctx),
    fetchResourceItem(() => fetchResumeDetails(requestOptions), ctx),
    fetchResourceItem(() => fetchResumeLinks(requestOptions), ctx),
    fetchResourceItem(() => fetchResumeSkills(requestOptions), ctx),
    fetchResourceItem(() => fetchResumeExperiences(requestOptions), ctx),
    fetchResourceItem(() => fetchResumeEducations(requestOptions), ctx),
  ]);

  if (ctx.signal.aborted) {
    return undefined;
  }

  return buildAggregatedProfile(results);
}

export function useResumeData(
  options: UseResumeDataOptions = {},
): UseResumeDataResult {
  const [state, dispatch] = useReducer(
    resumeDataReducer,
    options.autoFetch,
    initialResumeDataState,
  );
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  const reloadAll = useCallback(() => {
    setReloadTrigger((count) => count + 1);
  }, []);

  const optionsRef = useRef<UseResumeDataOptions>(options);
  optionsRef.current = options;

  useEffect(() => {
    if (optionsRef.current.autoFetch === false && reloadTrigger === 0) {
      return;
    }

    const abortController = new AbortController();
    let loadedCount = 0;
    let firstError: unknown = undefined;

    dispatch({ type: "START_FETCH" });

    const context: FetchProgressContext = {
      signal: abortController.signal,
      onProgress: () => {
        loadedCount += 1;
        dispatch({ type: "PROGRESS", count: loadedCount });
      },
      onError: (err: unknown) => {
        if (firstError === undefined) {
          firstError = err;
        }
      },
    };

    void fetchAllResources(
      { ...optionsRef.current, signal: abortController.signal },
      context,
    )
      .then((resolvedProfile) => {
        if (abortController.signal.aborted) {
          return;
        }
        if (firstError !== undefined || !resolvedProfile) {
          const fallback = resolveFallbackProfile(optionsRef.current);
          dispatch({
            type: "ERROR",
            error:
              firstError ?? new Error("Failed to load resume profile data"),
            fallbackProfile: fallback,
          });
          return;
        }
        dispatch({ type: "SUCCESS", profile: resolvedProfile });
      })
      .catch((err: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }
        const fallback = resolveFallbackProfile(optionsRef.current);
        dispatch({
          type: "ERROR",
          error: firstError ?? err,
          fallbackProfile: fallback,
        });
      });

    return () => {
      abortController.abort();
    };
  }, [reloadTrigger]);

  return {
    profile: state.profile,
    isLoading: state.isLoading,
    hasError: state.hasError,
    isFallback: state.isFallback,
    error: state.error,
    progress: state.progress,
    reloadAll,
  };
}

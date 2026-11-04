/**
 * Standard REST API envelope wrapper returned by the backend server.
 */
export interface ApiResponse<T> {
  /** Domain payload encapsulated within the response envelope. */
  readonly data: T;

  /** Indicates whether the API operation succeeded. */
  readonly success: boolean;

  /** ISO 8601 timestamp string representing when the response was generated. */
  readonly timestamp: string;
}

/**
 * Checks whether an unknown payload is a full backend envelope.
 *
 * @remarks
 * Requires `data`, a boolean `success`, and a string `timestamp`, so that a raw
 * domain object which merely contains `data` or `success` is not unwrapped.
 */
export function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "data" in value &&
    "success" in value &&
    "timestamp" in value &&
    typeof (value as { readonly success: unknown }).success === "boolean" &&
    typeof (value as { readonly timestamp: unknown }).timestamp === "string"
  );
}

/**
 * Defensive parser function to extract domain data from an API envelope or raw input.
 *
 * @remarks
 * If the payload is a full `ApiResponse<T>` envelope, the inner `data` payload is returned.
 * Otherwise, the input is returned as-is for graceful fallback and backward compatibility.
 * The input is never mutated.
 *
 * @typeParam T - The expected domain data type.
 * @param response - Payload received from the network or static fallback, typed as `unknown`.
 * @returns The inner `data` payload if wrapped in an `ApiResponse`, or the input as-is.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T selects the domain type at call sites
export function unwrapApiResponse<T>(response: unknown): T {
  if (isApiResponse(response)) {
    return response.data as T;
  }
  return response as T;
}

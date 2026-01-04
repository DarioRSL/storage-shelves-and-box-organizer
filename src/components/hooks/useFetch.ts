import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface UseFetchOptions<T = any> {
  url: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  retries?: number;
  skip?: boolean;
}

export interface UseFetchReturn<T = any> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for API calls with auth, error handling, loading states, and retry logic.
 * Centralized wrapper around apiFetch for consistent behavior across components.
 *
 * Features:
 * - Auto-inject Authorization header via apiFetch
 * - Handle 401 → can trigger redirect via onError
 * - Handle 403 → permission error
 * - Handle 404, 500 → show user-friendly errors
 * - Network error handling (timeout, connection failed)
 * - Generic typing for request/response
 * - Retry logic (optional exponential backoff)
 * - Skip flag to conditionally fetch
 *
 * Usage:
 * ```typescript
 * const { data, loading, error } = useFetch({
 *   url: '/api/boxes',
 *   method: 'GET'
 * });
 *
 * // With manual refetch
 * const { data, refetch } = useFetch({
 *   url: '/api/profile',
 *   skip: true // Don't fetch on mount
 * });
 *
 * const handleRefresh = async () => {
 *   await refetch();
 * };
 * ```
 */
export function useFetch<T = any>(options: UseFetchOptions<T>): UseFetchReturn<T> {
  const {
    url,
    method = "GET",
    body,
    headers,
    timeout = 30000,
    onSuccess,
    onError,
    retries = 0,
    skip = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<ApiError | null>(null);
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeRequest = useCallback(async () => {
    if (skip) {
      setLoading(false);
      return;
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, timeout);

      const result = await apiFetch<T>(url, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          ...headers,
        },
        signal: abortControllerRef.current.signal,
      });

      clearTimeout(timeoutId);
      setData(result);
      onSuccess?.(result);
      retryCountRef.current = 0;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);

        // Retry logic with exponential backoff
        if (retryCountRef.current < retries && err.status >= 500) {
          retryCountRef.current++;
          const delay = Math.pow(2, retryCountRef.current) * 1000;
          setTimeout(() => {
            executeRequest();
          }, delay);
          return;
        }

        onError?.(err);
      } else if (err instanceof DOMException && err.name === "AbortError") {
        // Timeout - treat as network error
        const timeoutError = new ApiError(0, "Request timeout. Please try again.");
        setError(timeoutError);
        onError?.(timeoutError);
      } else {
        // Unknown error
        const unknownError = new ApiError(500, "An unexpected error occurred");
        setError(unknownError);
        onError?.(unknownError);
      }
    } finally {
      setLoading(false);
    }
  }, [url, method, body, headers, timeout, onSuccess, onError, retries, skip]);

  // Initial fetch on mount or when dependencies change
  useEffect(() => {
    executeRequest();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [executeRequest]);

  const refetch = useCallback(async () => {
    retryCountRef.current = 0;
    await executeRequest();
  }, [executeRequest]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}

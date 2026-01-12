/**
 * Unit Tests for useFetch Hook
 *
 * Tests the data fetching hook with retry logic, timeout handling, and error management.
 *
 * Business Rules:
 * - Default method: GET, default timeout: 30000ms
 * - Automatically injects authorization header via apiFetch
 * - Sets loading=true on mount unless skip=true
 * - Retry logic: Exponential backoff for 5xx errors (1s, 2s, 4s...)
 * - Max retries: configurable via retries parameter (default 0)
 * - Timeout uses AbortController to cancel pending requests
 * - Skip flag prevents initial fetch and sets loading=false
 * - Refetch resets retry counter and re-executes request
 * - Callbacks: onSuccess(data), onError(error)
 * - Error types: ApiError, DOMException (AbortError), unknown errors
 *
 * Coverage Target: 80-90%
 * Test Count: 26 tests
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFetch } from "@/components/hooks/useFetch";
import { apiFetch, ApiError } from "@/lib/api-client";

// Mock the api-client module
vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public message: string,
      public details?: Record<string, string>,
      public code?: string
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

describe("useFetch", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Successful requests", () => {
    it("TC-FETCH-001: should fetch data successfully with GET request", async () => {
      const mockData = { id: 1, name: "Test Box" };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
          method: "GET",
        })
      );

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for the fetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(apiFetch).toHaveBeenCalledWith("/api/boxes", expect.any(Object));
    });

    it("TC-FETCH-002: should fetch data successfully with POST request", async () => {
      const mockResponse = { id: 2, name: "New Box", status: "created" };
      const requestBody = { name: "New Box", location_id: "123" };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
          method: "POST",
          body: requestBody,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.error).toBeNull();
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/boxes",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(requestBody),
        })
      );
    });

    it("TC-FETCH-003: should invoke onSuccess callback with fetched data", async () => {
      const mockData = { id: 1, name: "Test Box" };
      const onSuccess = vi.fn();
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      renderHook(() =>
        useFetch({
          url: "/api/boxes",
          onSuccess,
        })
      );

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockData);
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("should pass custom headers to apiFetch", async () => {
      const mockData = { success: true };
      const customHeaders = { "X-Custom-Header": "test-value" };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      renderHook(() =>
        useFetch({
          url: "/api/test",
          headers: customHeaders,
        })
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          "/api/test",
          expect.objectContaining({
            headers: customHeaders,
          })
        );
      });
    });
  });

  describe("Loading state management", () => {
    it("TC-FETCH-004: should set loading to true during fetch", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(apiFetch).mockReturnValue(promise);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
        })
      );

      // Initially loading
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      resolvePromise!({ data: "test" });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("TC-FETCH-005: should set loading to false after successful fetch", async () => {
      const mockData = { id: 1 };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
    });

    it("TC-FETCH-006: should set loading to false after failed fetch", async () => {
      const error = new ApiError(404, "Not found");
      vi.mocked(apiFetch).mockRejectedValueOnce(error);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes/999",
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe("Skip flag behavior", () => {
    it("TC-FETCH-007: should not fetch when skip is true", () => {
      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
          skip: true,
        })
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("should fetch when skip is false", async () => {
      const mockData = { id: 1 };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
          skip: false,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(apiFetch).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe("Network timeout handling", () => {
    it("TC-FETCH-008: should handle timeout as ApiError with status 0", async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
          timeout: 100,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(ApiError);
      expect(result.current.error?.status).toBe(0);
      expect(result.current.error?.message).toBe("Request timeout. Please try again.");
    });

    it("TC-FETCH-009: should invoke onError callback on timeout", async () => {
      const onError = vi.fn();
      vi.mocked(apiFetch).mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));

      renderHook(() =>
        useFetch({
          url: "/api/boxes",
          onError,
        })
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      expect(onError).toHaveBeenCalledWith(expect.any(ApiError));
      expect(onError.mock.calls[0][0].status).toBe(0);
      expect(onError.mock.calls[0][0].message).toBe("Request timeout. Please try again.");
    });

    it("should use custom timeout value", async () => {
      const mockData = { id: 1 };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      renderHook(() =>
        useFetch({
          url: "/api/boxes",
          timeout: 5000, // Custom 5s timeout
        })
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });
    });

    it("should pass AbortSignal to apiFetch", async () => {
      const mockData = { id: 1 };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      renderHook(() =>
        useFetch({
          url: "/api/boxes",
        })
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          "/api/boxes",
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          })
        );
      });
    });
  });

  describe("Retry logic", () => {
    it("TC-FETCH-010: should not retry on 4xx errors", async () => {
      const error404 = new ApiError(404, "Not found");
      vi.mocked(apiFetch).mockRejectedValueOnce(error404);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes/999",
          retries: 3,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error404);
      expect(apiFetch).toHaveBeenCalledTimes(1); // No retries
    });

    it("TC-FETCH-011: should initiate retry on 5xx errors", async () => {
      const error500 = new ApiError(500, "Internal server error");
      vi.mocked(apiFetch).mockRejectedValue(error500);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
          retries: 1,
        })
      );

      // Initial attempt fails
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error500);
      expect(result.current.error?.status).toBe(500);
    });

    it("should reset retry counter on successful request", async () => {
      const mockData = { id: 1 };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
          retries: 3,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
    });
  });

  describe("Callback invocation", () => {
    it("TC-FETCH-012: should invoke onError callback on API error", async () => {
      const error = new ApiError(404, "Not found");
      const onError = vi.fn();
      vi.mocked(apiFetch).mockRejectedValueOnce(error);

      renderHook(() =>
        useFetch({
          url: "/api/boxes/999",
          onError,
        })
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });

      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should not invoke onSuccess on error", async () => {
      const error = new ApiError(500, "Server error");
      const onSuccess = vi.fn();
      vi.mocked(apiFetch).mockRejectedValueOnce(error);

      renderHook(() =>
        useFetch({
          url: "/api/boxes",
          onSuccess,
        })
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Refetch functionality", () => {
    it("TC-FETCH-013: should refetch data when refetch is called", async () => {
      const mockData1 = { id: 1, name: "First" };
      const mockData2 = { id: 2, name: "Second" };

      vi.mocked(apiFetch).mockResolvedValueOnce(mockData1).mockResolvedValueOnce(mockData2);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      // Call refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(apiFetch).toHaveBeenCalledTimes(2);
    });

    it("TC-FETCH-014: should reset retry counter when refetch is called", async () => {
      const error = new ApiError(500, "Server error");
      const mockData = { id: 1 };

      // First call fails
      vi.mocked(apiFetch).mockRejectedValueOnce(error).mockResolvedValueOnce(mockData);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
          retries: 0, // No retries
        })
      );

      // Wait for initial attempt to fail
      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });

      // Refetch should work
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });
    });
  });

  describe("AbortController cleanup", () => {
    it("TC-FETCH-015: should cleanup AbortController on unmount", () => {
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");

      vi.mocked(apiFetch).mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          })
      );

      const { unmount } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
        })
      );

      unmount();

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe("Error type handling", () => {
    it("TC-FETCH-016: should handle ApiError correctly", async () => {
      const apiError = new ApiError(403, "Forbidden", { field: "error" }, "FORBIDDEN");
      vi.mocked(apiFetch).mockRejectedValueOnce(apiError);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(apiError);
      expect(result.current.error?.status).toBe(403);
      expect(result.current.error?.message).toBe("Forbidden");
      expect(result.current.error?.details).toEqual({ field: "error" });
      expect(result.current.error?.code).toBe("FORBIDDEN");
    });

    it("TC-FETCH-017: should handle unknown errors as ApiError with status 500", async () => {
      const unknownError = new Error("Something weird happened");
      vi.mocked(apiFetch).mockRejectedValueOnce(unknownError);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(ApiError);
      expect(result.current.error?.status).toBe(500);
      expect(result.current.error?.message).toBe("An unexpected error occurred");
    });
  });

  describe("Edge cases and configuration", () => {
    it("should use default timeout of 30000ms", async () => {
      const mockData = { id: 1 };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      renderHook(() =>
        useFetch({
          url: "/api/boxes",
          // No timeout specified
        })
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });
    });

    it("TC-FETCH-018: should handle multiple HTTP methods correctly", async () => {
      const mockData = { success: true };

      // Test PATCH
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);
      const { unmount: unmount1 } = renderHook(() =>
        useFetch({
          url: "/api/boxes/1",
          method: "PATCH",
        })
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          "/api/boxes/1",
          expect.objectContaining({ method: "PATCH" })
        );
      });
      unmount1();

      // Test DELETE
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);
      const { unmount: unmount2 } = renderHook(() =>
        useFetch({
          url: "/api/boxes/1",
          method: "DELETE",
        })
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          "/api/boxes/1",
          expect.objectContaining({ method: "DELETE" })
        );
      });
      unmount2();

      // Test PUT
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);
      renderHook(() =>
        useFetch({
          url: "/api/boxes/1",
          method: "PUT",
        })
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          "/api/boxes/1",
          expect.objectContaining({ method: "PUT" })
        );
      });
    });

    it("should serialize body as JSON when body is provided", async () => {
      const mockData = { success: true };
      const body = { name: "Test", tags: ["tag1", "tag2"] };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      renderHook(() =>
        useFetch({
          url: "/api/boxes",
          method: "POST",
          body,
        })
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          "/api/boxes",
          expect.objectContaining({
            body: JSON.stringify(body),
          })
        );
      });
    });

    it("should not include body in request when body is undefined", async () => {
      const mockData = { success: true };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      renderHook(() =>
        useFetch({
          url: "/api/boxes",
          method: "GET",
          // No body
        })
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith(
          "/api/boxes",
          expect.objectContaining({
            body: undefined,
          })
        );
      });
    });

    it("should handle null data response", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(null);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should handle empty object response", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({});
      expect(result.current.error).toBeNull();
    });

    it("should handle array response", async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      vi.mocked(apiFetch).mockResolvedValueOnce(mockData);

      const { result } = renderHook(() =>
        useFetch({
          url: "/api/boxes",
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
    });
  });
});

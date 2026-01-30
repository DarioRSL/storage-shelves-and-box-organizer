/**
 * Unit Tests for useBoxes Hook
 *
 * Tests the data fetching hook for boxes with search, location filtering, and pagination.
 *
 * Business Rules:
 * - Requires workspaceId to fetch data; returns empty results if missing
 * - Search query must be at least 3 characters (min-length validation)
 * - Search is debounced with 300ms delay via useDebounce hook
 * - Location filtering: specific location ID or null for "unassigned" boxes
 * - Pagination: configurable limit (default 50) and offset (default 0)
 * - Response format: handles both array and object with data/total properties
 * - Error handling: converts errors to user-friendly messages
 * - Refetch capability: manual re-fetch with refetch()
 * - Dependency tracking: re-fetches when dependencies change
 * - Loading state management: tracks fetch lifecycle
 *
 * Coverage Target: 80-90%
 * Test Count: 12 tests
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBoxes } from "@/components/hooks/useBoxes";
import { apiFetch, getUserFriendlyErrorMessage, logError } from "@/lib/api-client";
import type { BoxDto } from "@/types";

// Mock dependencies
vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
  getUserFriendlyErrorMessage: vi.fn((error: Error) => error.message || "An error occurred"),
  logError: vi.fn(),
}));

vi.mock("@/components/hooks/useDebounce", () => ({
  useDebounce: vi.fn((value: string | undefined) => value), // Pass-through by default
}));

// Import after mocking to get the mocked version
import { useDebounce } from "@/components/hooks/useDebounce";

describe("useBoxes", () => {
  const mockWorkspaceId = "workspace-123";
  const mockBoxes: BoxDto[] = [
    {
      id: "box-1",
      workspace_id: mockWorkspaceId,
      name: "Test Box 1",
      description: "First test box",
      location_id: "location-1",
      qr_code_id: "QR-ABC123",
      tags: ["tag1"],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      search_vector: null,
    } as BoxDto,
    {
      id: "box-2",
      workspace_id: mockWorkspaceId,
      name: "Test Box 2",
      description: "Second test box",
      location_id: null,
      qr_code_id: "QR-DEF456",
      tags: ["tag2"],
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      search_vector: null,
    } as BoxDto,
  ];

  beforeEach(() => {
    // Reset useDebounce to pass-through behavior by default
    vi.mocked(useDebounce).mockImplementation((value) => value);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Fetch without workspace", () => {
    it("TC-BOXES-001: should return empty results when no workspace ID provided", async () => {
      const { result } = renderHook(() => useBoxes(""));

      // Should not be loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.boxes).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.error).toBeNull();
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("should not fetch when workspace ID is undefined", async () => {
      const { result } = renderHook(() => useBoxes(undefined as any));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.boxes).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(apiFetch).not.toHaveBeenCalled();
    });
  });

  describe("Search query validation", () => {
    it("TC-BOXES-002: should not fetch when search query is less than 3 characters", async () => {
      vi.mocked(useDebounce).mockReturnValue("ab"); // 2 characters

      const { result } = renderHook(() => useBoxes(mockWorkspaceId, undefined, "ab"));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.boxes).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("TC-BOXES-003: should fetch when search query is at least 3 characters", async () => {
      vi.mocked(useDebounce).mockReturnValue("abc"); // 3 characters
      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes);

      const { result } = renderHook(() => useBoxes(mockWorkspaceId, undefined, "abc"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiFetch).toHaveBeenCalled();
      const callArgs = vi.mocked(apiFetch).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain("/api/boxes?");
      expect(result.current.boxes).toEqual(mockBoxes);
    });

    it("should include search query in URL params when provided", async () => {
      vi.mocked(useDebounce).mockReturnValue("search term");
      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes);

      renderHook(() => useBoxes(mockWorkspaceId, undefined, "search term"));

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });

      const callArgs = vi.mocked(apiFetch).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain("q=search+term");
    });
  });

  describe("Debounced search", () => {
    it("TC-BOXES-004: should use debounced value from useDebounce hook", async () => {
      const originalQuery = "original search";
      const debouncedQuery = "debounced search";

      vi.mocked(useDebounce).mockReturnValue(debouncedQuery);
      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes);

      renderHook(() => useBoxes(mockWorkspaceId, undefined, originalQuery));

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });

      // Verify useDebounce was called with correct parameters
      expect(useDebounce).toHaveBeenCalledWith(originalQuery, 300);

      // Verify API call uses debounced value
      const callArgs = vi.mocked(apiFetch).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain("q=debounced+search");
    });
  });

  describe("Location filtering", () => {
    it("TC-BOXES-005: should filter by specific location when location ID provided", async () => {
      const locationId = "location-123";
      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes);

      renderHook(() => useBoxes(mockWorkspaceId, locationId));

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });

      const callArgs = vi.mocked(apiFetch).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain(`location_id=${locationId}`);
    });

    it("TC-BOXES-006: should filter for unassigned boxes when location is null and no search query", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes);
      vi.mocked(useDebounce).mockReturnValue(undefined);

      renderHook(() => useBoxes(mockWorkspaceId, null, undefined));

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });

      const callArgs = vi.mocked(apiFetch).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain("is_assigned=false");
      expect(url).not.toContain("location_id");
    });

    it("should not set is_assigned=false when location is null but search query exists", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes);
      vi.mocked(useDebounce).mockReturnValue("search query");

      renderHook(() => useBoxes(mockWorkspaceId, null, "search query"));

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });

      const callArgs = vi.mocked(apiFetch).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).not.toContain("is_assigned=false");
      expect(url).toContain("q=search+query");
    });
  });

  describe("Pagination parameters", () => {
    it("TC-BOXES-007: should use default pagination values (limit=50, offset=0)", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes);

      renderHook(() => useBoxes(mockWorkspaceId));

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });

      const callArgs = vi.mocked(apiFetch).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain("limit=50");
      expect(url).toContain("offset=0");
    });

    it("should use custom pagination values when provided", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes);

      renderHook(() => useBoxes(mockWorkspaceId, undefined, undefined, 100, 25));

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });

      const callArgs = vi.mocked(apiFetch).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain("limit=100");
      expect(url).toContain("offset=25");
    });

    it("should include workspace_id in query params", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes);

      renderHook(() => useBoxes(mockWorkspaceId));

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });

      const callArgs = vi.mocked(apiFetch).mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain(`workspace_id=${mockWorkspaceId}`);
    });
  });

  describe("Response format handling", () => {
    it("TC-BOXES-008: should handle array response format", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes);

      const { result } = renderHook(() => useBoxes(mockWorkspaceId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.boxes).toEqual(mockBoxes);
      expect(result.current.totalCount).toBe(mockBoxes.length);
    });

    it("TC-BOXES-009: should handle object response format with data and total", async () => {
      const responseWithTotal = {
        data: mockBoxes,
        total: 150,
      };
      vi.mocked(apiFetch).mockResolvedValueOnce(responseWithTotal);

      const { result } = renderHook(() => useBoxes(mockWorkspaceId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.boxes).toEqual(mockBoxes);
      expect(result.current.totalCount).toBe(150);
    });

    it("should handle object response without total property", async () => {
      const responseWithoutTotal = {
        data: mockBoxes,
      };
      vi.mocked(apiFetch).mockResolvedValueOnce(responseWithoutTotal);

      const { result } = renderHook(() => useBoxes(mockWorkspaceId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.boxes).toEqual(mockBoxes);
      expect(result.current.totalCount).toBe(mockBoxes.length);
    });

    it("should handle empty array response", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useBoxes(mockWorkspaceId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.boxes).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });
  });

  describe("Error handling", () => {
    it("TC-BOXES-010: should set error message when fetch fails", async () => {
      const error = new Error("Network error");
      vi.mocked(apiFetch).mockRejectedValueOnce(error);
      vi.mocked(getUserFriendlyErrorMessage).mockReturnValue("Failed to fetch boxes");

      const { result } = renderHook(() => useBoxes(mockWorkspaceId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Failed to fetch boxes");
      expect(result.current.boxes).toEqual([]);
      expect(getUserFriendlyErrorMessage).toHaveBeenCalledWith(error);
      expect(logError).toHaveBeenCalledWith("[useBoxes]", error);
    });

    it("should clear error on successful retry", async () => {
      const error = new Error("Temporary error");
      vi.mocked(apiFetch).mockRejectedValueOnce(error).mockResolvedValueOnce(mockBoxes);
      vi.mocked(getUserFriendlyErrorMessage).mockReturnValue("Failed to fetch");

      const { result } = renderHook(() => useBoxes(mockWorkspaceId));

      // Wait for error
      await waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch");
      });

      // Trigger refetch
      await result.current.refetch();

      // Wait for successful refetch
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.boxes).toEqual(mockBoxes);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Manual refetch", () => {
    it("TC-BOXES-011: should allow manual refetch with refetch function", async () => {
      const firstResponse = [mockBoxes[0]];
      const secondResponse = mockBoxes;

      vi.mocked(apiFetch).mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(secondResponse);

      const { result } = renderHook(() => useBoxes(mockWorkspaceId));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.boxes).toEqual(firstResponse);
      });

      // Trigger manual refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.boxes).toEqual(secondResponse);
      });

      expect(apiFetch).toHaveBeenCalledTimes(2);
    });

    it("should set loading state during refetch", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes).mockReturnValueOnce(promise);

      const { result } = renderHook(() => useBoxes(mockWorkspaceId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger refetch
      const refetchPromise = result.current.refetch();

      // Check loading state while refetching
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      resolvePromise!(mockBoxes);
      await refetchPromise;

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Dependency changes", () => {
    it("TC-BOXES-012: should re-fetch when workspace ID changes", async () => {
      vi.mocked(apiFetch).mockResolvedValue(mockBoxes);

      const { rerender } = renderHook(({ workspaceId }) => useBoxes(workspaceId), {
        initialProps: { workspaceId: "workspace-1" },
      });

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(1);
      });

      // Change workspace ID
      rerender({ workspaceId: "workspace-2" });

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(2);
      });

      // Verify new workspace ID is used
      const secondCallUrl = vi.mocked(apiFetch).mock.calls[1][0] as string;
      expect(secondCallUrl).toContain("workspace_id=workspace-2");
    });

    it("should re-fetch when location ID changes", async () => {
      vi.mocked(apiFetch).mockResolvedValue(mockBoxes);

      const { rerender } = renderHook(({ locationId }) => useBoxes(mockWorkspaceId, locationId), {
        initialProps: { locationId: "location-1" as string | null | undefined },
      });

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(1);
      });

      // Change location ID
      rerender({ locationId: "location-2" });

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(2);
      });
    });

    it("should re-fetch when debounced search query changes", async () => {
      let debouncedValue = "first";
      vi.mocked(useDebounce).mockImplementation(() => debouncedValue);
      vi.mocked(apiFetch).mockResolvedValue(mockBoxes);

      const { rerender } = renderHook(({ query }) => useBoxes(mockWorkspaceId, undefined, query), {
        initialProps: { query: "first" },
      });

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(1);
      });

      // Change debounced value
      debouncedValue = "second";
      rerender({ query: "second" });

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(2);
      });
    });

    it("should re-fetch when pagination parameters change", async () => {
      vi.mocked(apiFetch).mockResolvedValue(mockBoxes);

      const { rerender } = renderHook(
        ({ limit, offset }) => useBoxes(mockWorkspaceId, undefined, undefined, limit, offset),
        { initialProps: { limit: 50, offset: 0 } }
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(1);
      });

      // Change pagination
      rerender({ limit: 50, offset: 50 });

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(2);
      });

      const secondCallUrl = vi.mocked(apiFetch).mock.calls[1][0] as string;
      expect(secondCallUrl).toContain("offset=50");
    });
  });

  describe("Loading states", () => {
    it("should set loading true at start of fetch", () => {
      vi.mocked(apiFetch).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useBoxes(mockWorkspaceId));

      expect(result.current.isLoading).toBe(true);
    });

    it("should set loading false after successful fetch", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(mockBoxes);

      const { result } = renderHook(() => useBoxes(mockWorkspaceId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.boxes).toEqual(mockBoxes);
    });

    it("should set loading false after failed fetch", async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error("Failed"));
      vi.mocked(getUserFriendlyErrorMessage).mockReturnValue("Error");

      const { result } = renderHook(() => useBoxes(mockWorkspaceId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Error");
    });
  });
});

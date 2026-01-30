/**
 * Unit Tests for useLocations Hook
 *
 * Tests the location fetching and tree node transformation logic.
 *
 * Business Rules:
 * - Requires valid workspaceId to fetch locations
 * - Supports fetching root locations (no parent_id) or child locations (with parent_id)
 * - Transforms LocationDto to LocationTreeNode with level calculation from ltree path
 * - Level calculation: path.split(".").length - 1 (e.g., "root.basement.shelf" = level 2)
 * - Sets boxCount to 0 (placeholder for box data), isExpanded to false, isLoading to false
 * - Provides refetch() function to manually re-fetch locations
 * - Handles errors with user-friendly messages via getUserFriendlyErrorMessage
 * - Loading state managed during fetch lifecycle
 * - Returns empty array when no locations found
 *
 * Coverage Target: 80-90%
 * Test Count: 10 tests
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLocations } from "@/components/hooks/useLocations";
import { apiFetch, getUserFriendlyErrorMessage, logError } from "@/lib/api-client";
import type { LocationDto } from "@/types";

// Mock the api-client module
vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
  getUserFriendlyErrorMessage: vi.fn((error: Error) => error.message),
  logError: vi.fn(),
}));

describe("useLocations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // Mock data factories
  const createMockLocation = (id: string, name: string, path: string, workspaceId = "ws-123"): LocationDto => ({
    id,
    workspace_id: workspaceId,
    name,
    description: null,
    path,
    parent_id: null,
    is_deleted: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  });

  describe("Fetch without workspace", () => {
    it("TC-LOCATIONS-001: should not fetch when workspaceId is empty string", () => {
      const { result } = renderHook(() => useLocations(""));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.locations).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("TC-LOCATIONS-002: should not fetch when workspaceId is null", () => {
      const { result } = renderHook(() => useLocations(null as unknown as string));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.locations).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(apiFetch).not.toHaveBeenCalled();
    });
  });

  describe("Root locations fetch", () => {
    it("TC-LOCATIONS-003: should fetch root locations without parent_id parameter", async () => {
      const mockLocations: LocationDto[] = [
        createMockLocation("loc-1", "Basement", "root.basement"),
        createMockLocation("loc-2", "Garage", "root.garage"),
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockLocations);

      const { result } = renderHook(() => useLocations("ws-123"));

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.locations).toEqual([]);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.locations).toHaveLength(2);
      expect(result.current.error).toBeNull();
      expect(apiFetch).toHaveBeenCalledWith("/api/locations?workspace_id=ws-123");
    });

    it("TC-LOCATIONS-004: should transform LocationDto to LocationTreeNode with correct level", async () => {
      const mockLocations: LocationDto[] = [
        createMockLocation("loc-1", "Basement", "root.basement"),
        createMockLocation("loc-2", "Shelf A", "root.basement.shelf_a"),
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockLocations);

      const { result } = renderHook(() => useLocations("ws-123"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify transformation
      expect(result.current.locations[0]).toMatchObject({
        id: "loc-1",
        name: "Basement",
        path: "root.basement",
        boxCount: 0,
        isExpanded: false,
        isLoading: false,
        level: 1, // root.basement = 2 parts - 1 = level 1
      });

      expect(result.current.locations[1]).toMatchObject({
        id: "loc-2",
        name: "Shelf A",
        path: "root.basement.shelf_a",
        boxCount: 0,
        isExpanded: false,
        isLoading: false,
        level: 2, // root.basement.shelf_a = 3 parts - 1 = level 2
      });
    });
  });

  describe("Child locations fetch", () => {
    it("TC-LOCATIONS-005: should fetch child locations with parent_id parameter", async () => {
      const mockLocations: LocationDto[] = [
        createMockLocation("loc-3", "Top Shelf", "root.basement.rack_a.top_shelf"),
        createMockLocation("loc-4", "Bottom Shelf", "root.basement.rack_a.bottom_shelf"),
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockLocations);

      const { result } = renderHook(() => useLocations("ws-123", "parent-123"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.locations).toHaveLength(2);
      expect(apiFetch).toHaveBeenCalledWith("/api/locations?workspace_id=ws-123&parent_id=parent-123");
    });

    it("TC-LOCATIONS-006: should handle null parent_id as root locations", async () => {
      const mockLocations: LocationDto[] = [createMockLocation("loc-1", "Root", "root")];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockLocations);

      const { result } = renderHook(() => useLocations("ws-123", null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not include parent_id in query string when null
      expect(apiFetch).toHaveBeenCalledWith("/api/locations?workspace_id=ws-123");
    });
  });

  describe("Tree node transformation and ltree path handling", () => {
    it("TC-LOCATIONS-007: should calculate correct level for deep hierarchical paths", async () => {
      const mockLocations: LocationDto[] = [
        createMockLocation("loc-1", "Root", "root"), // level 0
        createMockLocation("loc-2", "Level 1", "root.level1"), // level 1
        createMockLocation("loc-3", "Level 2", "root.level1.level2"), // level 2
        createMockLocation("loc-4", "Level 3", "root.level1.level2.level3"), // level 3
        createMockLocation("loc-5", "Level 4", "root.level1.level2.level3.level4"), // level 4
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockLocations);

      const { result } = renderHook(() => useLocations("ws-123"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.locations[0].level).toBe(0); // root = 1 part - 1 = 0
      expect(result.current.locations[1].level).toBe(1); // root.level1 = 2 parts - 1 = 1
      expect(result.current.locations[2].level).toBe(2); // root.level1.level2 = 3 parts - 1 = 2
      expect(result.current.locations[3].level).toBe(3); // root.level1.level2.level3 = 4 parts - 1 = 3
      expect(result.current.locations[4].level).toBe(4); // root.level1.level2.level3.level4 = 5 parts - 1 = 4
    });
  });

  describe("Error handling", () => {
    it("TC-LOCATIONS-008: should handle API errors with friendly messages", async () => {
      const apiError = new Error("Network error");
      const friendlyMessage = "Failed to load locations";

      vi.mocked(apiFetch).mockRejectedValueOnce(apiError);
      vi.mocked(getUserFriendlyErrorMessage).mockReturnValueOnce(friendlyMessage);

      const { result } = renderHook(() => useLocations("ws-123"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(friendlyMessage);
      expect(result.current.locations).toEqual([]);
      expect(getUserFriendlyErrorMessage).toHaveBeenCalledWith(apiError);
      expect(logError).toHaveBeenCalledWith("[useLocations]", apiError);
    });
  });

  describe("Empty results handling", () => {
    it("TC-LOCATIONS-009: should handle empty array response", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useLocations("ws-123"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.locations).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Manual refetch functionality", () => {
    it("TC-LOCATIONS-010: should refetch locations when refetch is called", async () => {
      const mockLocations1: LocationDto[] = [createMockLocation("loc-1", "First", "root.first")];
      const mockLocations2: LocationDto[] = [
        createMockLocation("loc-1", "First", "root.first"),
        createMockLocation("loc-2", "Second", "root.second"),
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockLocations1).mockResolvedValueOnce(mockLocations2);

      const { result } = renderHook(() => useLocations("ws-123"));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.locations).toHaveLength(1);
      });

      // Call refetch wrapped in act
      await waitFor(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.locations).toHaveLength(2);
      });

      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/locations?workspace_id=ws-123");
      expect(apiFetch).toHaveBeenNthCalledWith(2, "/api/locations?workspace_id=ws-123");
    });
  });

  describe("Loading state lifecycle", () => {
    it("should set loading to true during fetch and false after completion", async () => {
      const mockLocations: LocationDto[] = [createMockLocation("loc-1", "Test", "root.test")];

      let resolvePromise: (value: LocationDto[]) => void;
      const promise = new Promise<LocationDto[]>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(apiFetch).mockReturnValue(promise);

      const { result } = renderHook(() => useLocations("ws-123"));

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!(mockLocations);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.locations).toHaveLength(1);
    });

    it("should set loading to false after error", async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error("API Error"));

      const { result } = renderHook(() => useLocations("ws-123"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });
});

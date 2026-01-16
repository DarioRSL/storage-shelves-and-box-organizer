/**
 * Unit Tests for useWorkspaces Hook
 *
 * Tests the workspace fetching and auto-selection logic.
 *
 * Business Rules:
 * - Automatically fetches workspaces on mount
 * - Auto-selects first workspace if none selected
 * - Auto-selects first workspace if stored workspace doesn't exist
 * - Maintains stored workspace selection if it exists in list
 * - Updates currentWorkspaceId nano store on auto-selection
 * - Handles empty workspace arrays gracefully
 * - Provides user-friendly error messages via apiFetch
 * - Tracks loading state during fetch lifecycle
 * - Does not auto-select if stored workspace is valid
 * - Provides refetch capability for manual refresh
 *
 * Coverage Target: 80-90%
 * Test Count: 10 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWorkspaces } from "@/components/hooks/useWorkspaces";
import { apiFetch, getUserFriendlyErrorMessage, logError } from "@/lib/api-client";
import type { WorkspaceDto } from "@/types";
import { currentWorkspaceId } from "@/stores/dashboard";

// Mock dependencies
vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
  getUserFriendlyErrorMessage: vi.fn((err: Error) => err.message),
  logError: vi.fn(),
}));

// Mock nano store
vi.mock("@/stores/dashboard", () => ({
  currentWorkspaceId: {
    get: vi.fn(),
    set: vi.fn(),
    subscribe: vi.fn(),
  },
}));

describe("useWorkspaces", () => {
  // Mock data factories
  const createMockWorkspace = (id: string, name: string): WorkspaceDto => ({
    id,
    name,
    description: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Workspace Fetch on Mount", () => {
    it("TC-WORKSPACES-001: should fetch workspaces automatically on mount", async () => {
      const mockWorkspaces = [
        createMockWorkspace("ws-1", "Workspace 1"),
        createMockWorkspace("ws-2", "Workspace 2"),
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { result } = renderHook(() => useWorkspaces());

      // Initial state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.workspaces).toEqual([]);
      expect(result.current.error).toBeNull();

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.workspaces).toEqual(mockWorkspaces);
      expect(result.current.error).toBeNull();
      expect(apiFetch).toHaveBeenCalledWith("/api/workspaces");
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });

    it("TC-WORKSPACES-002: should set loading to false after successful fetch", async () => {
      const mockWorkspaces = [createMockWorkspace("ws-1", "Workspace 1")];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { result } = renderHook(() => useWorkspaces());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.workspaces).toEqual(mockWorkspaces);
    });
  });

  describe("Auto-Selection Logic", () => {
    it("TC-WORKSPACES-003: should auto-select first workspace when none is stored", async () => {
      const mockWorkspaces = [
        createMockWorkspace("ws-1", "Workspace 1"),
        createMockWorkspace("ws-2", "Workspace 2"),
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { result } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify auto-selection of first workspace
      expect(currentWorkspaceId.set).toHaveBeenCalledWith("ws-1");
      expect(currentWorkspaceId.set).toHaveBeenCalledTimes(1);
    });

    it("TC-WORKSPACES-004: should auto-select first workspace when stored workspace doesn't exist", async () => {
      const mockWorkspaces = [
        createMockWorkspace("ws-1", "Workspace 1"),
        createMockWorkspace("ws-2", "Workspace 2"),
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue("ws-nonexistent");

      const { result } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify auto-selection of first workspace (stored workspace not found)
      expect(currentWorkspaceId.set).toHaveBeenCalledWith("ws-1");
      expect(currentWorkspaceId.set).toHaveBeenCalledTimes(1);
    });

    it("TC-WORKSPACES-005: should not auto-select when stored workspace exists in list", async () => {
      const mockWorkspaces = [
        createMockWorkspace("ws-1", "Workspace 1"),
        createMockWorkspace("ws-2", "Workspace 2"),
        createMockWorkspace("ws-3", "Workspace 3"),
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue("ws-2");

      const { result } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify no auto-selection (stored workspace exists)
      expect(currentWorkspaceId.set).not.toHaveBeenCalled();
    });

    it("TC-WORKSPACES-006: should not auto-select when workspace list is empty", async () => {
      const mockWorkspaces: WorkspaceDto[] = [];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { result } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify no auto-selection (empty list)
      expect(currentWorkspaceId.set).not.toHaveBeenCalled();
      expect(result.current.workspaces).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("TC-WORKSPACES-007: should handle API errors with user-friendly messages", async () => {
      const error = new Error("Network failure");
      const friendlyMessage = "Connection lost. Please try again.";

      vi.mocked(apiFetch).mockRejectedValueOnce(error);
      vi.mocked(getUserFriendlyErrorMessage).mockReturnValue(friendlyMessage);
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { result } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(friendlyMessage);
      expect(result.current.workspaces).toEqual([]);
      expect(getUserFriendlyErrorMessage).toHaveBeenCalledWith(error);
      expect(logError).toHaveBeenCalledWith("useWorkspaces", error);
    });

    it("TC-WORKSPACES-008: should set loading to false after error", async () => {
      const error = new Error("API error");

      vi.mocked(apiFetch).mockRejectedValueOnce(error);
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { result } = renderHook(() => useWorkspaces());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it("TC-WORKSPACES-009: should clear error on successful fetch after error", async () => {
      const mockWorkspaces = [createMockWorkspace("ws-1", "Workspace 1")];

      // First call fails
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error("First error"));
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { result, unmount } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      unmount();

      // Second mount succeeds
      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.clearAllMocks();

      const { result: result2 } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false);
      });

      expect(result2.current.error).toBeNull();
      expect(result2.current.workspaces).toEqual(mockWorkspaces);
    });
  });

  describe("Real-world Use Cases", () => {
    it("TC-WORKSPACES-010: should handle complete workspace fetch and auto-selection workflow", async () => {
      const mockWorkspaces = [
        createMockWorkspace("ws-1", "Personal Workspace"),
        createMockWorkspace("ws-2", "Team Workspace"),
        createMockWorkspace("ws-3", "Project Workspace"),
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { result } = renderHook(() => useWorkspaces());

      // Initial loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.workspaces).toEqual([]);
      expect(result.current.error).toBeNull();

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify final state
      expect(result.current.workspaces).toHaveLength(3);
      expect(result.current.workspaces[0].name).toBe("Personal Workspace");
      expect(result.current.error).toBeNull();

      // Verify auto-selection
      expect(currentWorkspaceId.set).toHaveBeenCalledWith("ws-1");

      // Verify API interaction
      expect(apiFetch).toHaveBeenCalledWith("/api/workspaces");
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle workspace list with only one workspace", async () => {
      const mockWorkspaces = [createMockWorkspace("ws-only", "Only Workspace")];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { result } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.workspaces).toHaveLength(1);
      expect(currentWorkspaceId.set).toHaveBeenCalledWith("ws-only");
    });

    it("should preserve stored workspace when it's the last workspace in list", async () => {
      const mockWorkspaces = [
        createMockWorkspace("ws-1", "Workspace 1"),
        createMockWorkspace("ws-2", "Workspace 2"),
        createMockWorkspace("ws-last", "Last Workspace"),
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue("ws-last");

      const { result } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not auto-select (stored workspace exists)
      expect(currentWorkspaceId.set).not.toHaveBeenCalled();
    });

    it("should handle workspace fetch with null/undefined description fields", async () => {
      const mockWorkspaces = [
        createMockWorkspace("ws-1", "Workspace 1"),
        { ...createMockWorkspace("ws-2", "Workspace 2"), description: undefined as unknown as null },
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { result } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.workspaces).toHaveLength(2);
      expect(result.current.workspaces[1].description).toBeFalsy();
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent mount and unmount correctly", async () => {
      const mockWorkspaces = [createMockWorkspace("ws-1", "Workspace 1")];

      vi.mocked(apiFetch).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockWorkspaces), 100);
          })
      );
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { unmount } = renderHook(() => useWorkspaces());

      // Unmount before fetch completes
      unmount();

      // Should not throw errors
      expect(apiFetch).toHaveBeenCalled();
    });

    it("should handle store.get returning empty string", async () => {
      const mockWorkspaces = [
        createMockWorkspace("ws-1", "Workspace 1"),
        createMockWorkspace("ws-2", "Workspace 2"),
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue("");

      const { result } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Empty string is falsy, should auto-select
      expect(currentWorkspaceId.set).toHaveBeenCalledWith("ws-1");
    });


    it("should handle malformed workspace data gracefully", async () => {
      const mockWorkspaces = [
        createMockWorkspace("ws-1", "Valid Workspace"),
        { ...createMockWorkspace("ws-2", ""), id: "ws-2" }, // Empty name
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockWorkspaces);
      vi.mocked(currentWorkspaceId.get).mockReturnValue(null);

      const { result } = renderHook(() => useWorkspaces());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still work with malformed data
      expect(result.current.workspaces).toHaveLength(2);
      expect(result.current.workspaces[1].name).toBe("");
    });
  });
});

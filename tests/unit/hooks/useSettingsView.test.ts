/**
 * Unit Tests for useSettingsView Hook
 *
 * Tests the Settings view state management and API interactions.
 *
 * Business Rules:
 * - Parallel data loading (profile + workspaces) on initialization
 * - Workspace CRUD operations with optimistic updates
 * - Account deletion redirects to /auth on success
 * - Data export generates CSV blob and triggers download
 * - Modal state management (create/edit/delete confirmation)
 * - Error/success messages auto-dismiss after 3 seconds
 * - Compound loading states per operation type
 * - 401 errors trigger redirect to /auth
 * - Member count calculated for each workspace, fallback to 0 on error
 *
 * Coverage Target: 80-90%
 * Test Count: 16 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSettingsView } from "@/components/hooks/useSettingsView";
import * as apiClient from "@/lib/api-client";
import type {
  ProfileDto,
  WorkspaceDto,
  WorkspaceMemberWithProfileDto,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
} from "@/types";

// Mock api-client module
vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual("@/lib/api-client");
  return {
    ...actual,
    apiFetch: vi.fn(),
    shouldRedirectToLogin: vi.fn(),
    ApiError: actual.ApiError,
  };
});

describe("useSettingsView", () => {
  const mockUserId = "user-123";

  // Mock data factories
  const createMockProfile = (): ProfileDto => ({
    id: mockUserId,
    email: "test@example.com",
    full_name: "Test User",
    avatar_url: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  });

  const createMockWorkspace = (id: string, name: string): WorkspaceDto => ({
    id,
    name,
    description: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  });

  const createMockMember = (
    userId: string,
    role: "owner" | "admin" | "member" | "read_only"
  ): WorkspaceMemberWithProfileDto => ({
    id: `member-${userId}`,
    user_id: userId,
    workspace_id: "ws-1",
    role,
    joined_at: "2024-01-01T00:00:00Z",
    profile: {
      email: "member@example.com",
      full_name: "Member User",
      avatar_url: null,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Clean and recreate document body for React Testing Library
    document.body = document.createElement("body");
    const container = document.createElement("div");
    container.setAttribute("id", "root");
    document.body.appendChild(container);

    // Mock window.location
    delete (window as { location?: Location }).location;
    window.location = { href: "" } as Location;

    // Mock window.URL methods
    window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();

    // Store the original createElement before mocking
    const originalCreateElement = document.createElement.bind(document);

    // Create a real anchor element but spy on its methods
    const createElementSpy = vi.spyOn(document, "createElement");
    createElementSpy.mockImplementation((tagName: string) => {
      if (tagName === "a") {
        const anchor = originalCreateElement("a") as HTMLAnchorElement;
        anchor.click = vi.fn();
        return anchor;
      }
      return originalCreateElement(tagName);
    });

    vi.spyOn(document.body, "appendChild");
    vi.spyOn(document.body, "removeChild");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Initial data loading", () => {
    it("TC-SETTINGS-001: should load profile and workspaces in parallel on fetchData", async () => {
      const mockProfile = createMockProfile();
      const mockWorkspaces = [createMockWorkspace("ws-1", "Workspace 1")];
      const mockMembers = [createMockMember(mockUserId, "owner")];

      vi.mocked(apiClient.apiFetch)
        .mockResolvedValueOnce(mockProfile) // fetchProfile
        .mockResolvedValueOnce(mockWorkspaces) // fetchWorkspaces
        .mockResolvedValueOnce(mockMembers); // fetch members for ws-1

      const { result } = renderHook(() => useSettingsView(mockUserId));

      // Initial state
      expect(result.current.state.currentProfile).toBeNull();
      expect(result.current.state.workspaces).toEqual([]);

      // Fetch data
      await act(async () => {
        await result.current.fetchData();
      });

      // Verify profile loaded
      expect(result.current.state.currentProfile).toEqual(mockProfile);

      // Verify workspaces loaded with ownership info
      expect(result.current.state.workspaces).toHaveLength(1);
      expect(result.current.state.workspaces[0]).toMatchObject({
        id: "ws-1",
        name: "Workspace 1",
        isOwner: true,
        memberCount: 1,
      });

      // Verify API calls
      expect(apiClient.apiFetch).toHaveBeenCalledWith("/api/profiles/me");
      expect(apiClient.apiFetch).toHaveBeenCalledWith("/api/workspaces");
      expect(apiClient.apiFetch).toHaveBeenCalledWith("/api/workspaces/ws-1/members");
    });

    it("TC-SETTINGS-002: should handle 401 error and redirect to /auth during profile fetch", async () => {
      const error = new apiClient.ApiError(401, "Unauthorized");
      vi.mocked(apiClient.apiFetch).mockRejectedValueOnce(error);
      vi.mocked(apiClient.shouldRedirectToLogin).mockReturnValue(true);

      const { result } = renderHook(() => useSettingsView(mockUserId));

      await act(async () => {
        await result.current.fetchData();
      });

      // Should redirect
      expect(window.location.href).toBe("/auth");
      // Should not set error in state (redirect happens)
      expect(result.current.state.error).toBeNull();
    });

    it("TC-SETTINGS-003: should set error message when profile fetch fails (non-401)", async () => {
      const error = new Error("Network error");
      vi.mocked(apiClient.apiFetch)
        .mockRejectedValueOnce(error) // fetchProfile fails
        .mockResolvedValueOnce([]); // fetchWorkspaces succeeds
      vi.mocked(apiClient.shouldRedirectToLogin).mockReturnValue(false);

      const { result } = renderHook(() => useSettingsView(mockUserId));

      await act(async () => {
        await result.current.fetchData();
      });

      expect(result.current.state.error).toBe("Network error");
      expect(result.current.state.currentProfile).toBeNull();
    });

    it("TC-SETTINGS-004: should fallback to memberCount: 0 when member fetch fails for workspace", async () => {
      const mockProfile = createMockProfile();
      const mockWorkspaces = [createMockWorkspace("ws-1", "Workspace 1"), createMockWorkspace("ws-2", "Workspace 2")];

      vi.mocked(apiClient.apiFetch)
        .mockResolvedValueOnce(mockProfile) // fetchProfile
        .mockResolvedValueOnce(mockWorkspaces) // fetchWorkspaces
        .mockRejectedValueOnce(new Error("Members fetch failed")) // ws-1 members fails
        .mockResolvedValueOnce([createMockMember(mockUserId, "member")]); // ws-2 members succeeds

      const { result } = renderHook(() => useSettingsView(mockUserId));

      await act(async () => {
        await result.current.fetchData();
      });

      // ws-1 should have fallback values
      expect(result.current.state.workspaces[0]).toMatchObject({
        id: "ws-1",
        isOwner: false,
        memberCount: 0,
      });

      // ws-2 should have real values
      expect(result.current.state.workspaces[1]).toMatchObject({
        id: "ws-2",
        isOwner: false,
        memberCount: 1,
      });
    });
  });

  describe("Workspace CRUD operations", () => {
    it("TC-SETTINGS-005: should create workspace successfully and refresh list", async () => {
      const mockWorkspace = createMockWorkspace("ws-new", "New Workspace");
      const mockWorkspaces = [mockWorkspace];
      const mockMembers = [createMockMember(mockUserId, "owner")];

      vi.mocked(apiClient.apiFetch)
        .mockResolvedValueOnce(mockWorkspace) // createWorkspace
        .mockResolvedValueOnce(mockWorkspaces) // fetchWorkspaces after creation
        .mockResolvedValueOnce(mockMembers); // fetch members

      const { result } = renderHook(() => useSettingsView(mockUserId));

      // Open modal
      act(() => {
        result.current.openCreateModal();
      });
      expect(result.current.state.isCreateWorkspaceModalOpen).toBe(true);

      // Create workspace
      await act(async () => {
        await result.current.createWorkspace("New Workspace");
      });

      // Verify modal closed
      expect(result.current.state.isCreateWorkspaceModalOpen).toBe(false);

      // Verify success message
      expect(result.current.state.successMessage).toBe("Workspace created successfully");

      // Verify workspaces refreshed
      expect(result.current.state.workspaces).toHaveLength(1);
      expect(result.current.state.workspaces[0].name).toBe("New Workspace");

      // Verify API calls
      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        "/api/workspaces",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "New Workspace" } as CreateWorkspaceRequest),
        })
      );
    });

    it("TC-SETTINGS-006: should update workspace successfully and close edit modal", async () => {
      const mockWorkspaces = [createMockWorkspace("ws-1", "Updated Workspace")];
      const mockMembers = [createMockMember(mockUserId, "owner")];

      vi.mocked(apiClient.apiFetch)
        .mockResolvedValueOnce(undefined) // updateWorkspace
        .mockResolvedValueOnce(mockWorkspaces) // fetchWorkspaces after update
        .mockResolvedValueOnce(mockMembers); // fetch members

      const { result } = renderHook(() => useSettingsView(mockUserId));

      // Open edit modal
      const workspaceToEdit = createMockWorkspace("ws-1", "Old Name");
      act(() => {
        result.current.openEditModal(workspaceToEdit);
      });

      expect(result.current.state.isEditWorkspaceModalOpen).toBe(true);
      expect(result.current.state.selectedWorkspaceForEdit).toEqual(workspaceToEdit);

      // Update workspace
      await act(async () => {
        await result.current.updateWorkspace("ws-1", "Updated Workspace");
      });

      // Verify modal closed and selection cleared
      expect(result.current.state.isEditWorkspaceModalOpen).toBe(false);
      expect(result.current.state.selectedWorkspaceForEdit).toBeNull();

      // Verify success message
      expect(result.current.state.successMessage).toBe("Workspace updated successfully");

      // Verify API call
      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        "/api/workspaces/ws-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "Updated Workspace" } as UpdateWorkspaceRequest),
        })
      );
    });

    it("TC-SETTINGS-007: should handle 404 error during update and refresh workspaces", async () => {
      const error = new apiClient.ApiError(404, "Workspace not found");
      const mockWorkspaces: WorkspaceDto[] = [];

      vi.mocked(apiClient.apiFetch)
        .mockRejectedValueOnce(error) // updateWorkspace fails with 404
        .mockResolvedValueOnce(mockWorkspaces); // fetchWorkspaces after 404

      const { result } = renderHook(() => useSettingsView(mockUserId));

      // Open edit modal
      act(() => {
        result.current.openEditModal(createMockWorkspace("ws-1", "Old Name"));
      });

      // Update workspace
      await act(async () => {
        try {
          await result.current.updateWorkspace("ws-1", "Updated Workspace");
        } catch {
          // Expected to throw
        }
      });

      // Verify modal closed after 404
      expect(result.current.state.isEditWorkspaceModalOpen).toBe(false);

      // Verify error set
      expect(result.current.state.error).toBe("Workspace not found");

      // Verify workspaces refreshed
      expect(apiClient.apiFetch).toHaveBeenCalledWith("/api/workspaces");
    });

    it("TC-SETTINGS-008: should delete workspace successfully and close confirmation", async () => {
      const mockWorkspaces: WorkspaceDto[] = [];

      vi.mocked(apiClient.apiFetch)
        .mockResolvedValueOnce(undefined) // deleteWorkspace
        .mockResolvedValueOnce(mockWorkspaces); // fetchWorkspaces after delete

      const { result } = renderHook(() => useSettingsView(mockUserId));

      // Open delete confirmation
      act(() => {
        result.current.openDeleteConfirmation("workspace", "ws-1");
      });

      expect(result.current.state.isDeleteConfirmationOpen).toBe(true);
      expect(result.current.state.deleteConfirmationType).toBe("workspace");
      expect(result.current.state.deleteTargetId).toBe("ws-1");

      // Delete workspace
      await act(async () => {
        await result.current.deleteWorkspace("ws-1");
      });

      // Verify confirmation closed
      expect(result.current.state.isDeleteConfirmationOpen).toBe(false);
      expect(result.current.state.deleteTargetId).toBeNull();

      // Verify success message
      expect(result.current.state.successMessage).toBe("Workspace deleted successfully");

      // Verify API call
      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        "/api/workspaces/ws-1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("TC-SETTINGS-009: should handle 404 error during delete and refresh workspaces", async () => {
      const error = new apiClient.ApiError(404, "Workspace not found");
      const mockWorkspaces: WorkspaceDto[] = [];

      vi.mocked(apiClient.apiFetch)
        .mockRejectedValueOnce(error) // deleteWorkspace fails with 404
        .mockResolvedValueOnce(mockWorkspaces); // fetchWorkspaces after 404

      const { result } = renderHook(() => useSettingsView(mockUserId));

      await act(async () => {
        try {
          await result.current.deleteWorkspace("ws-1");
        } catch {
          // Expected to throw
        }
      });

      // Verify error set
      expect(result.current.state.error).toBe("Workspace not found");

      // Verify workspaces refreshed
      expect(apiClient.apiFetch).toHaveBeenCalledWith("/api/workspaces");
    });
  });

  describe("Account deletion", () => {
    it("TC-SETTINGS-010: should delete account successfully and redirect to /auth", async () => {
      vi.mocked(apiClient.apiFetch).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useSettingsView(mockUserId));

      await act(async () => {
        await result.current.deleteAccount();
      });

      // Verify redirect
      expect(window.location.href).toBe("/auth");

      // Verify API call
      expect(apiClient.apiFetch).toHaveBeenCalledWith(
        "/api/auth/delete-account",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("TC-SETTINGS-011: should handle error during account deletion and not redirect", async () => {
      const error = new Error("Failed to delete account");
      vi.mocked(apiClient.apiFetch).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSettingsView(mockUserId));

      await act(async () => {
        try {
          await result.current.deleteAccount();
        } catch {
          // Expected to throw
        }
      });

      // Should not redirect
      expect(window.location.href).toBe("");

      // Should set error
      expect(result.current.state.error).toBe("Failed to delete account");
    });
  });

  describe("Data export", () => {
    it("TC-SETTINGS-012: should export data successfully and trigger download", async () => {
      const mockBlob = new Blob(["csv,content"], { type: "text/csv" });
      const mockResponse = {
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      } as unknown as Response;

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSettingsView(mockUserId));

      await act(async () => {
        await result.current.exportData("ws-1");
      });

      // Verify fetch called with correct params
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/export/inventory?workspace_id=ws-1",
        expect.objectContaining({
          method: "GET",
          credentials: "include",
        })
      );

      // Verify blob URL created
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);

      // Verify download link created and clicked
      expect(document.createElement).toHaveBeenCalledWith("a");
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();

      // Verify cleanup
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

      // Verify success message
      expect(result.current.state.successMessage).toBe("Data exported successfully");
    });

    it("TC-SETTINGS-013: should handle empty blob and show appropriate message", async () => {
      const emptyBlob = new Blob([], { type: "text/csv" });
      const mockResponse = {
        ok: true,
        blob: vi.fn().mockResolvedValue(emptyBlob),
      } as unknown as Response;

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSettingsView(mockUserId));

      await act(async () => {
        await result.current.exportData("ws-1");
      });

      // Should not trigger download
      const mockAnchor = document.createElement("a") as HTMLAnchorElement & { click: ReturnType<typeof vi.fn> };
      expect(mockAnchor.click).not.toHaveBeenCalled();

      // Verify message
      expect(result.current.state.successMessage).toBe("No data to export");
    });

    it("TC-SETTINGS-014: should handle export error gracefully", async () => {
      const mockResponse = {
        ok: false,
      } as Response;

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSettingsView(mockUserId));

      await act(async () => {
        await result.current.exportData("ws-1");
      });

      // Verify error set
      expect(result.current.state.error).toBe("Failed to export data");
    });
  });

  describe("Modal state management", () => {
    it("TC-SETTINGS-015: should manage create/edit/delete modal states correctly", () => {
      const { result } = renderHook(() => useSettingsView(mockUserId));

      // Initial state - all closed
      expect(result.current.state.isCreateWorkspaceModalOpen).toBe(false);
      expect(result.current.state.isEditWorkspaceModalOpen).toBe(false);
      expect(result.current.state.isDeleteConfirmationOpen).toBe(false);

      // Open create modal
      act(() => {
        result.current.openCreateModal();
      });
      expect(result.current.state.isCreateWorkspaceModalOpen).toBe(true);

      // Close create modal
      act(() => {
        result.current.closeCreateModal();
      });
      expect(result.current.state.isCreateWorkspaceModalOpen).toBe(false);

      // Open edit modal
      const workspace = createMockWorkspace("ws-1", "Test");
      act(() => {
        result.current.openEditModal(workspace);
      });
      expect(result.current.state.isEditWorkspaceModalOpen).toBe(true);
      expect(result.current.state.selectedWorkspaceForEdit).toEqual(workspace);

      // Close edit modal
      act(() => {
        result.current.closeEditModal();
      });
      expect(result.current.state.isEditWorkspaceModalOpen).toBe(false);
      expect(result.current.state.selectedWorkspaceForEdit).toBeNull();

      // Open delete confirmation
      act(() => {
        result.current.openDeleteConfirmation("workspace", "ws-1");
      });
      expect(result.current.state.isDeleteConfirmationOpen).toBe(true);
      expect(result.current.state.deleteConfirmationType).toBe("workspace");
      expect(result.current.state.deleteTargetId).toBe("ws-1");

      // Close delete confirmation
      act(() => {
        result.current.closeDeleteConfirmation();
      });
      expect(result.current.state.isDeleteConfirmationOpen).toBe(false);
      expect(result.current.state.deleteTargetId).toBeNull();
    });
  });

  describe("Loading states", () => {
    it("TC-SETTINGS-016: should track loading states per operation type", async () => {
      const mockProfile = createMockProfile();
      const mockWorkspaces: WorkspaceDto[] = [];

      let resolveProfile: (value: ProfileDto) => void;
      let resolveWorkspaces: (value: WorkspaceDto[]) => void;

      // Create promises that we control
      const profilePromise = new Promise<ProfileDto>((resolve) => {
        resolveProfile = resolve;
      });
      const workspacesPromise = new Promise<WorkspaceDto[]>((resolve) => {
        resolveWorkspaces = resolve;
      });

      vi.mocked(apiClient.apiFetch)
        .mockReturnValueOnce(profilePromise as Promise<ProfileDto>)
        .mockReturnValueOnce(workspacesPromise as Promise<WorkspaceDto[]>);

      const { result } = renderHook(() => useSettingsView(mockUserId));

      // Start fetch - don't await
      act(() => {
        void result.current.fetchData();
      });

      // Wait a bit for state to update
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Should be loading
      expect(result.current.state.isLoading.fetchProfile).toBe(true);
      expect(result.current.state.isLoading.fetchWorkspaces).toBe(true);

      // Resolve the promises
      await act(async () => {
        resolveProfile!(mockProfile);
        resolveWorkspaces!(mockWorkspaces);
      });

      // Should not be loading anymore
      expect(result.current.state.isLoading.fetchProfile).toBe(false);
      expect(result.current.state.isLoading.fetchWorkspaces).toBe(false);
    });
  });
});

import { useState, useCallback } from "react";
import type {
  SettingsViewState,
  OperationType,
  ProfileDto,
  WorkspaceDto,
  WorkspaceWithOwnershipInfo,
  WorkspaceMemberWithProfileDto,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
} from "../../types";
import { apiFetch, ApiError, shouldRedirectToLogin } from "../../lib/api-client";

/**
 * Custom hook for managing Settings view state and API interactions.
 * Centralizes all state management and business logic for the Settings page.
 */
export function useSettingsView(currentUserId: string) {
  const [state, setState] = useState<SettingsViewState>({
    workspaces: [],
    currentProfile: null,
    selectedWorkspaceForEdit: null,
    isCreateWorkspaceModalOpen: false,
    isEditWorkspaceModalOpen: false,
    isDeleteConfirmationOpen: false,
    deleteConfirmationType: "workspace",
    deleteTargetId: null,
    isLoading: {},
    error: null,
    successMessage: null,
    theme: "system",
  });

  const setLoading = useCallback((operation: OperationType, value: boolean) => {
    setState((prev) => ({
      ...prev,
      isLoading: { ...prev.isLoading, [operation]: value },
    }));
  }, []);

  const setError = useCallback((message: string | null) => {
    setState((prev) => ({ ...prev, error: message }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const setSuccessMessage = useCallback((message: string | null) => {
    setState((prev) => ({ ...prev, successMessage: message }));
  }, []);

  const fetchProfile = useCallback(async () => {
    setLoading("fetchProfile", true);
    clearError();

    try {
      const profile = await apiFetch<ProfileDto>("/api/profiles/me");
      setState((prev) => ({ ...prev, currentProfile: profile }));
    } catch (error) {
      if (shouldRedirectToLogin(error)) {
        window.location.href = "/auth";
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to fetch profile";
      setError(message);
    } finally {
      setLoading("fetchProfile", false);
    }
  }, [setLoading, clearError, setError]);

  const fetchWorkspaces = useCallback(async () => {
    setLoading("fetchWorkspaces", true);
    clearError();

    try {
      const workspaces = await apiFetch<WorkspaceDto[]>("/api/workspaces");

      const workspacesWithOwnership = await Promise.all(
        workspaces.map(async (workspace) => {
          try {
            const members = await apiFetch<WorkspaceMemberWithProfileDto[]>(`/api/workspaces/${workspace.id}/members`);
            const currentMember = members.find((m) => m.user_id === currentUserId);
            const isOwner = currentMember?.role === "owner";

            return {
              ...workspace,
              isOwner,
              memberCount: members.length,
            } as WorkspaceWithOwnershipInfo;
          } catch {
            return {
              ...workspace,
              isOwner: false,
              memberCount: 0,
            } as WorkspaceWithOwnershipInfo;
          }
        })
      );

      setState((prev) => ({ ...prev, workspaces: workspacesWithOwnership }));
    } catch (error) {
      if (shouldRedirectToLogin(error)) {
        window.location.href = "/auth";
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to fetch workspaces";
      setError(message);
    } finally {
      setLoading("fetchWorkspaces", false);
    }
  }, [currentUserId, setLoading, clearError, setError]);

  const fetchData = useCallback(async () => {
    await Promise.all([fetchProfile(), fetchWorkspaces()]);
  }, [fetchProfile, fetchWorkspaces]);

  const createWorkspace = useCallback(
    async (name: string) => {
      setLoading("createWorkspace", true);
      clearError();

      try {
        const requestBody: CreateWorkspaceRequest = { name };
        await apiFetch<WorkspaceDto>("/api/workspaces", {
          method: "POST",
          body: JSON.stringify(requestBody),
        });

        await fetchWorkspaces();
        setState((prev) => ({ ...prev, isCreateWorkspaceModalOpen: false }));
        setSuccessMessage("Workspace created successfully");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create workspace";
        setError(message);
        throw error;
      } finally {
        setLoading("createWorkspace", false);
      }
    },
    [setLoading, clearError, setError, fetchWorkspaces, setSuccessMessage]
  );

  const updateWorkspace = useCallback(
    async (id: string, name: string) => {
      setLoading("updateWorkspace", true);
      clearError();

      try {
        const requestBody: UpdateWorkspaceRequest = { name };
        await apiFetch(`/api/workspaces/${id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        });

        await fetchWorkspaces();
        setState((prev) => ({ ...prev, isEditWorkspaceModalOpen: false, selectedWorkspaceForEdit: null }));
        setSuccessMessage("Workspace updated successfully");
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          await fetchWorkspaces();
          setState((prev) => ({ ...prev, isEditWorkspaceModalOpen: false }));
        }
        const message = error instanceof Error ? error.message : "Failed to update workspace";
        setError(message);
        throw error;
      } finally {
        setLoading("updateWorkspace", false);
      }
    },
    [setLoading, clearError, setError, fetchWorkspaces, setSuccessMessage]
  );

  const deleteWorkspace = useCallback(
    async (id: string) => {
      setLoading("deleteWorkspace", true);
      clearError();

      try {
        await apiFetch(`/api/workspaces/${id}`, {
          method: "DELETE",
        });

        await fetchWorkspaces();
        setState((prev) => ({
          ...prev,
          isDeleteConfirmationOpen: false,
          deleteTargetId: null,
        }));
        setSuccessMessage("Workspace deleted successfully");
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          await fetchWorkspaces();
        }
        const message = error instanceof Error ? error.message : "Failed to delete workspace";
        setError(message);
        throw error;
      } finally {
        setLoading("deleteWorkspace", false);
      }
    },
    [setLoading, clearError, setError, fetchWorkspaces, setSuccessMessage]
  );

  const deleteAccount = useCallback(async () => {
    setLoading("deleteAccount", true);
    clearError();

    try {
      await apiFetch("/api/auth/delete-account", {
        method: "DELETE",
      });

      window.location.href = "/auth";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete account";
      setError(message);
      throw error;
    } finally {
      setLoading("deleteAccount", false);
    }
  }, [setLoading, clearError, setError]);

  const exportData = useCallback(
    async (workspaceId: string) => {
      setLoading("exportData", true);
      clearError();

      try {
        const response = await fetch(`/api/export/inventory?workspace_id=${workspaceId}`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to export data");
        }

        const blob = await response.blob();

        if (blob.size === 0) {
          setSuccessMessage("No data to export");
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccessMessage("Data exported successfully");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to export data";
        setError(message);
      } finally {
        setLoading("exportData", false);
      }
    },
    [setLoading, clearError, setError, setSuccessMessage]
  );

  const openCreateModal = useCallback(() => {
    setState((prev) => ({ ...prev, isCreateWorkspaceModalOpen: true }));
  }, []);

  const closeCreateModal = useCallback(() => {
    setState((prev) => ({ ...prev, isCreateWorkspaceModalOpen: false }));
  }, []);

  const openEditModal = useCallback((workspace: WorkspaceDto) => {
    setState((prev) => ({
      ...prev,
      selectedWorkspaceForEdit: workspace,
      isEditWorkspaceModalOpen: true,
    }));
  }, []);

  const closeEditModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedWorkspaceForEdit: null,
      isEditWorkspaceModalOpen: false,
    }));
  }, []);

  const openDeleteConfirmation = useCallback((type: "workspace" | "account", id: string | null) => {
    setState((prev) => ({
      ...prev,
      isDeleteConfirmationOpen: true,
      deleteConfirmationType: type,
      deleteTargetId: id,
    }));
  }, []);

  const closeDeleteConfirmation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDeleteConfirmationOpen: false,
      deleteTargetId: null,
    }));
  }, []);

  return {
    state,
    fetchData,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    deleteAccount,
    exportData,
    setError,
    clearError,
    setSuccessMessage,
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    openDeleteConfirmation,
    closeDeleteConfirmation,
  };
}

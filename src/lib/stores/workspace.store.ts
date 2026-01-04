import { atom } from "nanostores";
import type { WorkspaceDto } from "@/types";

/**
 * Global workspace state for managing current workspace selection.
 * Allows components to access and modify the active workspace without prop drilling.
 */

export interface WorkspaceState {
  currentWorkspaceId: string | null;
  workspaces: WorkspaceDto[];
  isLoading: boolean;
  error: string | null;
}

// Initialize workspace store with default state
export const workspaceStore = atom<WorkspaceState>({
  currentWorkspaceId: null,
  workspaces: [],
  isLoading: false,
  error: null,
});

/**
 * Set current workspace ID
 */
export function setCurrentWorkspace(workspaceId: string): void {
  const state = workspaceStore.get();
  workspaceStore.set({
    ...state,
    currentWorkspaceId: workspaceId,
  });
}

/**
 * Set list of user's workspaces
 */
export function setWorkspaces(workspaces: WorkspaceDto[]): void {
  const state = workspaceStore.get();
  workspaceStore.set({
    ...state,
    workspaces,
  });
}

/**
 * Set loading state
 */
export function setWorkspaceLoading(loading: boolean): void {
  const state = workspaceStore.get();
  workspaceStore.set({
    ...state,
    isLoading: loading,
  });
}

/**
 * Set error message
 */
export function setWorkspaceError(error: string | null): void {
  const state = workspaceStore.get();
  workspaceStore.set({
    ...state,
    error,
  });
}

/**
 * Clear workspace state (on logout)
 */
export function clearWorkspace(): void {
  workspaceStore.set({
    currentWorkspaceId: null,
    workspaces: [],
    isLoading: false,
    error: null,
  });
}

/**
 * Get current workspace object from state
 */
export function getCurrentWorkspaceObject(): WorkspaceDto | null {
  const state = workspaceStore.get();
  if (!state.currentWorkspaceId) return null;
  return state.workspaces.find((w) => w.id === state.currentWorkspaceId) || null;
}

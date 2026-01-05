import { atom } from "nanostores";
import type { ProfileDto, WorkspaceDto } from "@/types";
import { log } from "@/lib/services/logger";

/**
 * Global authentication state.
 * Manages user session, profile, and workspace information.
 */
export interface AuthState {
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  user: ProfileDto | null;
  workspace: WorkspaceDto | null;
  token: string | null;
}

// Initialize auth store with default state
export const authStore = atom<AuthState>({
  isLoading: false,
  error: null,
  isAuthenticated: false,
  user: null,
  workspace: null,
  token: null,
});

/**
 * Set loading state during authentication operations.
 */
export function setAuthLoading(loading: boolean): void {
  const state = authStore.get();
  authStore.set({
    ...state,
    isLoading: loading,
  });
}

/**
 * Set error message for display to user.
 */
export function setAuthError(error: string | null): void {
  const state = authStore.get();
  authStore.set({
    ...state,
    error,
  });
}

/**
 * Set successful authentication state with user and workspace data.
 */
export function setAuthSuccess(data: { user: ProfileDto; workspace: WorkspaceDto; token: string }): void {
  authStore.set({
    isLoading: false,
    error: null,
    isAuthenticated: true,
    user: data.user,
    workspace: data.workspace,
    token: data.token,
  });
}

/**
 * Clear authentication state (logout).
 */
export function clearAuth(): void {
  authStore.set({
    isLoading: false,
    error: null,
    isAuthenticated: false,
    user: null,
    workspace: null,
    token: null,
  });
}

/**
 * Restore session from browser storage if available.
 * Called on app initialization to persist user session.
 */
export function restoreSessionFromStorage(): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem("authSession");
    if (stored) {
      const session = JSON.parse(stored) as AuthState;
      authStore.set(session);
    }
  } catch (error) {
    log.error("Auth Store failed to restore session", { error });
    clearAuth();
  }
}

/**
 * Save current auth state to storage for persistence.
 */
export function persistAuthState(): void {
  if (typeof window === "undefined") return;

  try {
    const state = authStore.get();
    if (state.isAuthenticated && state.token) {
      localStorage.setItem("authSession", JSON.stringify(state));
    }
  } catch (error) {
    log.error("Auth Store failed to persist session", { error });
  }
}

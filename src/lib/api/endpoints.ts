/**
 * Typed API endpoint definitions for type-safe API communication.
 * This module provides centralized, strongly-typed API method definitions
 * for all existing backend endpoints.
 *
 * Each method wraps the base apiFetch function with specific endpoint URLs,
 * HTTP methods, and response types. This ensures type safety when calling APIs
 * throughout the application.
 *
 * Usage:
 * ```typescript
 * import { apiClient } from '@/lib/api/endpoints';
 *
 * // Create workspace
 * const workspace = await apiClient.workspaces.create({ name: 'My Workspace' });
 *
 * // Delete location
 * await apiClient.locations.delete(locationId);
 * ```
 */

import { apiFetch } from "@/lib/api-client";
import type * as Types from "@/types";

/**
 * AUTH ENDPOINTS
 * POST /api/auth/session - Create session cookie from JWT token
 * DELETE /api/auth/session - Logout and clear session
 * DELETE /api/auth/delete-account - Permanently delete user account
 */
export const authApi = {
  createSession: async (token: string): Promise<{ message: string }> => {
    return apiFetch("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  logout: async (): Promise<{ message: string }> => {
    return apiFetch("/api/auth/session", {
      method: "DELETE",
    });
  },

  deleteAccount: async (): Promise<Types.DeleteAccountResponse> => {
    return apiFetch("/api/auth/delete-account", {
      method: "DELETE",
    });
  },
};

/**
 * PROFILES ENDPOINTS
 * GET /api/profiles/me - Get current user's profile
 * PATCH /api/profiles/me - Update current user's profile
 */
export const profilesApi = {
  getMe: async (): Promise<Types.ProfileDto> => {
    return apiFetch("/api/profiles/me", {
      method: "GET",
    });
  },

  updateMe: async (data: Partial<Types.ProfileDto>): Promise<Types.ProfileDto> => {
    return apiFetch("/api/profiles/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

/**
 * WORKSPACES ENDPOINTS
 * GET /api/workspaces - Get all user's workspaces
 * POST /api/workspaces - Create new workspace
 * GET /api/workspaces/:workspace_id - Get workspace details
 * PATCH /api/workspaces/:workspace_id - Update workspace
 * DELETE /api/workspaces/:workspace_id - Delete workspace
 * GET /api/workspaces/:workspace_id/members - Get workspace members
 * POST /api/workspaces/:workspace_id/members - Invite member
 * PATCH /api/workspaces/:workspace_id/members/:user_id - Update member role
 * DELETE /api/workspaces/:workspace_id/members/:user_id - Remove member
 */
export const workspacesApi = {
  list: async (): Promise<Types.WorkspaceDto[]> => {
    return apiFetch("/api/workspaces", {
      method: "GET",
    });
  },

  create: async (data: Types.CreateWorkspaceRequest): Promise<Types.WorkspaceDto> => {
    return apiFetch("/api/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  get: async (workspaceId: string): Promise<Types.WorkspaceDto> => {
    return apiFetch(`/api/workspaces/${workspaceId}`, {
      method: "GET",
    });
  },

  update: async (workspaceId: string, data: Types.PatchWorkspaceRequest): Promise<Types.PatchWorkspaceResponse> => {
    return apiFetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete: async (workspaceId: string): Promise<Types.DeleteWorkspaceResponse> => {
    return apiFetch(`/api/workspaces/${workspaceId}`, {
      method: "DELETE",
    });
  },

  getMembers: async (workspaceId: string): Promise<Types.WorkspaceMemberWithProfileDto[]> => {
    return apiFetch(`/api/workspaces/${workspaceId}/members`, {
      method: "GET",
    });
  },

  inviteMember: async (
    workspaceId: string,
    data: Types.InviteWorkspaceMemberRequest
  ): Promise<Types.WorkspaceMemberWithProfileDto> => {
    return apiFetch(`/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateMemberRole: async (
    workspaceId: string,
    userId: string,
    data: Types.UpdateWorkspaceMemberRequest
  ): Promise<Types.WorkspaceMemberDto> => {
    return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  removeMember: async (workspaceId: string, userId: string): Promise<{ message: string }> => {
    return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: "DELETE",
    });
  },
};

/**
 * LOCATIONS ENDPOINTS
 * GET /api/locations - Get locations for workspace (optionally filtered by parent)
 * POST /api/locations - Create new location
 * GET /api/locations/:id - Get location details
 * PATCH /api/locations/:id - Update location
 * DELETE /api/locations/:id - Delete location
 */
export const locationsApi = {
  list: async (
    workspaceId: string,
    parentId?: string | null,
    params?: Record<string, string>
  ): Promise<Types.LocationDto[]> => {
    const queryParams = new URLSearchParams({
      workspace_id: workspaceId,
      ...(parentId && { parent_id: parentId }),
      ...params,
    });

    return apiFetch(`/api/locations?${queryParams}`, {
      method: "GET",
    });
  },

  create: async (data: Types.CreateLocationRequest): Promise<Types.LocationDto> => {
    return apiFetch("/api/locations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  get: async (locationId: string): Promise<Types.LocationDto> => {
    return apiFetch(`/api/locations/${locationId}`, {
      method: "GET",
    });
  },

  update: async (locationId: string, data: Partial<Types.LocationDto>): Promise<Types.LocationDto> => {
    return apiFetch(`/api/locations/${locationId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete: async (locationId: string): Promise<{ message: string }> => {
    return apiFetch(`/api/locations/${locationId}`, {
      method: "DELETE",
    });
  },
};

/**
 * BOXES ENDPOINTS
 * GET /api/boxes - Get boxes for workspace (with optional location/search filters)
 * POST /api/boxes - Create new box
 * GET /api/boxes/:id - Get box details
 * PATCH /api/boxes/:id - Update box
 * DELETE /api/boxes/:id - Delete box
 */
export const boxesApi = {
  list: async (
    workspaceId: string,
    locationId?: string | null,
    searchQuery?: string,
    params?: Record<string, string>
  ): Promise<{ boxes: Types.BoxDto[]; total: number }> => {
    const queryParams = new URLSearchParams({
      workspace_id: workspaceId,
      ...(locationId && { location_id: locationId }),
      ...(searchQuery && { q: searchQuery }),
      ...params,
    });

    return apiFetch(`/api/boxes?${queryParams}`, {
      method: "GET",
    });
  },

  create: async (data: Types.CreateBoxRequest): Promise<Types.BoxDto> => {
    return apiFetch("/api/boxes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  get: async (boxId: string): Promise<Types.BoxDto> => {
    return apiFetch(`/api/boxes/${boxId}`, {
      method: "GET",
    });
  },

  update: async (boxId: string, data: Types.UpdateBoxRequest | Partial<Types.BoxDto>): Promise<Types.BoxDto> => {
    return apiFetch(`/api/boxes/${boxId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete: async (boxId: string): Promise<{ message: string }> => {
    return apiFetch(`/api/boxes/${boxId}`, {
      method: "DELETE",
    });
  },
};

/**
 * QR CODES ENDPOINTS
 * POST /api/qr-codes/batch - Generate batch of QR codes
 * GET /api/qr-codes/:short_id - Get QR code details
 */
export const qrCodesApi = {
  generateBatch: async (workspaceId: string, quantity: number): Promise<Types.BatchGenerateQrCodesResponse> => {
    return apiFetch("/api/qr-codes/batch", {
      method: "POST",
      body: JSON.stringify({
        workspace_id: workspaceId,
        quantity,
      }),
    });
  },

  get: async (shortId: string): Promise<Types.QrCodeDto> => {
    return apiFetch(`/api/qr-codes/${shortId}`, {
      method: "GET",
    });
  },
};

/**
 * EXPORT ENDPOINTS
 * GET /api/export/inventory - Export workspace inventory as CSV
 */
export const exportApi = {
  inventory: async (workspaceId: string): Promise<Blob> => {
    const response = await fetch(`/api/export/inventory?workspace_id=${workspaceId}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "text/csv",
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  },
};

/**
 * Centralized API client with all endpoints
 * Provides single point for accessing all API methods with type safety
 */
export const apiClient = {
  auth: authApi,
  profiles: profilesApi,
  workspaces: workspacesApi,
  locations: locationsApi,
  boxes: boxesApi,
  qrCodes: qrCodesApi,
  export: exportApi,
};

export type ApiClient = typeof apiClient;

import type { Database } from "./db/database.types";

// Helpers to extract Row/Insert/Update types from Supabase definitions
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];

// --- 1. Profiles ---

/**
 * Represents a user profile in the system.
 * Maps to 'profiles' table.
 */
export type ProfileDto = Tables<"profiles">;

// --- 2. Workspaces ---

/**
 * Represents a workspace (tenant).
 * Maps to 'workspaces' table.
 */
export type WorkspaceDto = Tables<"workspaces">;

/**
 * Payload for creating a new workspace.
 */
export type CreateWorkspaceRequest = Pick<Tables<"workspaces">, "name">;

/**
 * Payload for updating a workspace via PATCH.
 */
export interface PatchWorkspaceRequest {
  name?: string; // Optional, max 255 chars, will be trimmed
  description?: string | null; // Optional (reserved for future use)
}

/**
 * Response when updating a workspace via PATCH.
 * Extends WorkspaceDto to include all workspace fields.
 */
export type PatchWorkspaceResponse = WorkspaceDto;

/**
 * Response when deleting a workspace via DELETE.
 * Returns confirmation message with deleted workspace ID.
 */
export interface DeleteWorkspaceResponse {
  message: string;
  workspace_id: string;
}

/**
 * Response when deleting a user account via DELETE /api/auth/delete-account.
 * Returns confirmation message with no sensitive user data.
 */
export interface DeleteAccountResponse {
  message: string;
}

// --- 2.1 Workspace Members ---

/**
 * Represents workspace membership with user role.
 * Maps to 'workspace_members' table.
 */
export type WorkspaceMemberDto = Tables<"workspace_members">;

/**
 * User role within a workspace.
 * Maps to 'user_role' enum.
 * Values: 'owner' | 'admin' | 'member' | 'read_only'
 */
export type UserRole = Enums<"user_role">;

/**
 * Extended workspace member information with user profile.
 * Used for GET /workspaces/:workspace_id/members response.
 */
export interface WorkspaceMemberWithProfileDto extends WorkspaceMemberDto {
  profile: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Request to invite a new member to a workspace.
 */
export interface InviteWorkspaceMemberRequest {
  email: string;
  role: UserRole;
}

/**
 * Request to update a workspace member's role.
 */
export interface UpdateWorkspaceMemberRequest {
  role: UserRole;
}

// --- 3. Locations ---

/**
 * Represents a storage location (room, shelf, etc.).
 * Maps to 'locations' table.
 */
export interface LocationDto extends Omit<Tables<"locations">, "path"> {
  /**
   * The hierarchical path (ltree) converted to string representation (e.g. "root.basement.shelf_a")
   */
  path: string;
  /**
   * Derived parent ID from the hierarchy logic, if applicable.
   */
  parent_id?: string | null;
}

/**
 * Payload for creating a new location.
 */
export interface CreateLocationRequest {
  workspace_id: string;
  name: string;
  description?: string | null;
  /**
   * ID of the parent location. If null, creates a root location.
   */
  parent_id?: string | null;
}

/**
 * Payload for updating a location.
 */
export type UpdateLocationRequest = Partial<Pick<Tables<"locations">, "name" | "description">>;

/**
 * Response when updating a location (partial data).
 * Based on API specification (PATCH /locations/:id response).
 */
export interface UpdateLocationResponse {
  id: string;
  name: string;
  description: string | null;
  updated_at: string | null;
}

/**
 * Query parameters for GET /locations endpoint.
 */
export interface GetLocationsQuery {
  workspace_id: string;
  parent_id?: string | null;
}

// --- 4. Boxes ---

/**
 * Nested object structure for Location summary within a Box response.
 */
export interface BoxLocationSummary {
  id?: string;
  name: string;
  path?: string;
}

/**
 * Nested object structure for QR Code summary within a Box response.
 * Contains the QR code's own short_id for scanning purposes.
 */
export interface BoxQrCodeSummary {
  id: string; // QR code's UUID
  short_id: string; // QR code's short_id (format: QR-XXXXXX)
}

/**
 * Represents a Box (item container).
 * Maps to 'boxes' table with additional joined data.
 */
export interface BoxDto extends Tables<"boxes"> {
  /**
   * Nested location details if joined.
   */
  location?: BoxLocationSummary | null;
  /**
   * Nested QR code details if joined.
   */
  qr_code?: BoxQrCodeSummary | null;
}

/**
 * Payload for creating a new box.
 * Only workspace_id and name are required.
 */
export interface CreateBoxRequest {
  workspace_id: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  location_id?: string | null;
  /**
   * Optional QR Code ID to link immediately upon creation.
   */
  qr_code_id?: string | null;
}

/**
 * Response when creating a new box (partial data).
 * Based on API specification (POST /boxes response).
 */
export interface CreateBoxResponse {
  id: string;
  short_id: string;
  name: string;
  workspace_id: string;
  created_at: string | null;
}

/**
 * Payload for updating a box.
 */
export type UpdateBoxRequest = Partial<Pick<Tables<"boxes">, "name" | "description" | "tags" | "location_id">>;

/**
 * Response when updating a box (partial data).
 * Based on API specification (PATCH /boxes/:id response).
 */
export interface UpdateBoxResponse {
  id: string;
  name: string;
  updated_at: string | null;
}

/**
 * Query parameters for GET /boxes endpoint (search/filter).
 */
export interface GetBoxesQuery {
  workspace_id: string;
  q?: string; // Search query for full-text search
  location_id?: string | null; // Filter by specific location
  is_assigned?: boolean; // Filter for assigned/unassigned boxes
  limit?: number; // Pagination limit
  offset?: number; // Pagination offset
}

// --- 5. QR Codes ---

/**
 * Represents a QR Code.
 * Maps to 'qr_codes' table.
 * Each QR code has its own unique short_id (format: QR-XXXXXX) for scanning.
 */
export type QrCodeDto = Tables<"qr_codes">;

/**
 * QR Code status enum.
 * Represents the lifecycle state of a QR code:
 * - 'generated': QR code created but not yet printed
 * - 'printed': QR code has been printed on a physical label
 * - 'assigned': QR code is linked to a box
 */
export type QrStatus = Enums<"qr_status">;

/**
 * Request to generate a batch of QR codes.
 */
export interface BatchGenerateQrCodesRequest {
  workspace_id: string;
  quantity: number;
}

/**
 * Response wrapper for batch QR code generation.
 * Returns array of generated QR codes with their short_ids for printing.
 */
export interface BatchGenerateQrCodesResponse {
  data: {
    id: string;
    short_id: string;
    status: QrStatus;
    workspace_id: string;
    created_at: string | null;
  }[];
}

/**
 * Detailed QR Code response for scanning endpoint (GET /qr-codes/:short_id).
 * Used to resolve a scanned QR code and determine routing logic.
 */
export interface QrCodeDetailDto {
  id: string;
  short_id: string;
  box_id: string | null;
  status: QrStatus;
  workspace_id: string;
}

// --- 6. General API Responses ---

/**
 * Generic success message response.
 */
export interface SuccessResponse {
  message: string;
}

/**
 * Error response structure.
 */
export interface ErrorResponse {
  error: string;
  details?: unknown;
}

// --- 7. Validation Constants ---

/**
 * Business rules and validation limits from the API specification.
 * These should be used for client-side validation and are enforced server-side.
 */
export const ValidationRules = {
  locations: {
    MAX_HIERARCHY_DEPTH: 5,
  },
  boxes: {
    MAX_DESCRIPTION_LENGTH: 10000,
  },
  qrCodes: {
    MIN_BATCH_QUANTITY: 1,
    MAX_BATCH_QUANTITY: 100,
  },
} as const;

// --- 8. Export & Data Portability ---

/**
 * Request query parameters for GET /api/export/inventory endpoint.
 */
export interface ExportInventoryQuery {
  workspace_id: string; // UUID v4 format
  format?: "csv" | "json"; // Default: 'csv'
}

/**
 * Single box record in CSV/JSON export output.
 * All fields are strings/nulls for CSV compatibility.
 */
export interface ExportedBoxRecord {
  id: string;
  short_id: string;
  name: string;
  location: string; // Formatted breadcrumb (e.g., "Basement > Shelf A") or empty string
  description: string | null;
  tags: string; // CSV format (comma-separated) for CSV export, array for JSON
  qr_code: string | null; // Format: "QR-XXXXXX" or empty string
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * JSON export format with metadata wrapper.
 * Used for GET /api/export/inventory with format=json.
 */
export interface ExportInventoryJsonResponse {
  meta: {
    workspace_id: string;
    export_date: string; // ISO 8601 timestamp
    total_records: number;
    format_version: string; // e.g., "1.0"
  };
  data: (Omit<ExportedBoxRecord, "tags"> & {
    tags: string[]; // Array format in JSON (converted from CSV string)
  })[];
}

/**
 * Export file result returned by export service.
 */
export interface ExportFileResult {
  content: string; // CSV or JSON content
  mimeType: "text/csv" | "application/json";
  filename: string; // e.g., "inventory-{workspace_id}-{date}.csv"
}

// --- 9. Utility Types ---

/**
 * Represents pagination metadata that could be returned with list endpoints.
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

/**
 * Generic paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

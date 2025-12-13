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

// --- 2.1 Workspace Members ---

/**
 * Represents workspace membership with user role.
 * Maps to 'workspace_members' table.
 */
export type WorkspaceMemberDto = Tables<"workspace_members">;

/**
 * User role within a workspace.
 * Maps to 'user_role' enum.
 */
export type UserRole = Enums<"user_role">;

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
 *
 * Note: The 'short_id' field here refers to the box's short_id, not the QR code's.
 * In the database, QR codes don't have short_id - only boxes do.
 * This structure is used when returning box details with its associated QR code info.
 */
export interface BoxQrCodeSummary {
  id: string; // QR code's UUID
  short_id: string; // Box's short_id (for convenience, duplicated from parent)
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
 *
 * IMPORTANT: In the database schema, qr_codes table does NOT have a 'short_id' field.
 * The 'short_id' belongs to the 'boxes' table. The API plan shows short_id in QR responses,
 * but this is likely derived from the associated box when the QR code is assigned.
 */
export type QrCodeDto = Tables<"qr_codes">;

/**
 * QR Code status enum.
 * Represents the lifecycle state of a QR code.
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
 * Wraps the array of generated QR codes.
 */
export interface BatchGenerateQrCodesResponse {
  data: {
    id: string;
    status: QrStatus;
    workspace_id: string;
    created_at: string | null;
  }[];
}

/**
 * Detailed QR Code response for scanning endpoint.
 *
 * CLARIFICATION NEEDED: The API plan shows 'short_id' in the response (GET /qr-codes/:short_id),
 * but the database schema shows that only 'boxes' have 'short_id', not 'qr_codes'.
 *
 * Possible interpretations:
 * 1. The endpoint URL uses box's short_id, not QR code's id
 * 2. The response should include the associated box's short_id when assigned
 * 3. QR codes should have their own short_id (requires schema update)
 *
 * For now, this type assumes scenario #2: short_id is included when box is assigned.
 */
export interface QrCodeDetailDto {
  id: string;
  box_id: string | null;
  status: QrStatus;
  workspace_id: string;
  /**
   * Short ID of the associated box (if assigned).
   * Undefined/null if QR code is not yet assigned to a box.
   */
  short_id?: string | null;
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

// --- 8. Utility Types ---

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

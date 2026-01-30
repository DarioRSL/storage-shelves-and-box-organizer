import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateLocationRequest, LocationDto, UpdateLocationRequest, UpdateLocationResponse } from "@/types";
import { sanitizeForLtree } from "@/lib/utils/transliterate";
import { log } from "./logger";

/**
 * Custom error classes for location service operations
 */
export class WorkspaceMembershipError extends Error {
  constructor(message = "Nie masz uprawnień do tworzenia lokalizacji w tej przestrzeni roboczej") {
    super(message);
    this.name = "WorkspaceMembershipError";
  }
}

export class ParentNotFoundError extends Error {
  constructor(message = "Nie znaleziono lokalizacji nadrzędnej") {
    super(message);
    this.name = "ParentNotFoundError";
  }
}

export class MaxDepthExceededError extends Error {
  constructor(
    message = "Przekroczono maksymalną głębokość hierarchii. Lokalizacje mogą być zagnieżdżone maksymalnie na 5 poziomach."
  ) {
    super(message);
    this.name = "MaxDepthExceededError";
  }
}

export class SiblingConflictError extends Error {
  constructor(message = "Lokalizacja o tej nazwie już istnieje na tym poziomie") {
    super(message);
    this.name = "SiblingConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Location not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message = "A location with this name already exists at this level") {
    super(message);
    this.name = "ConflictError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden: You do not have access to this location") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Normalizes location name for ltree path generation.
 * Converts to lowercase, replaces special characters with underscores.
 * PostgreSQL ltree labels must match: [A-Za-z0-9_] and be 1-256 characters.
 *
 * @param name - The location name to normalize
 * @returns Normalized name suitable for ltree paths
 *
 * @example
 * normalizeLocationName("Shelf A") // returns "shelf_a"
 * normalizeLocationName("Top-Left Corner!") // returns "top_left_corner"
 * normalizeLocationName("Box #123") // returns "box_123"
 */
export function normalizeLocationName(name: string): string {
  // Use sanitizeForLtree which handles Polish character transliteration
  return sanitizeForLtree(name);
}

/**
 * Alias for normalizeLocationName, used in PATCH endpoint implementation.
 * Converts location name to URL-safe slug for ltree path.
 *
 * @param name - The location name to slugify
 * @returns Slugified name suitable for ltree paths
 */
export function slugify(name: string): string {
  return normalizeLocationName(name);
}

/**
 * Extracts parent path from an ltree path string.
 *
 * @param path - Full ltree path (e.g., "root.garage.shelf_a")
 * @returns Parent path (e.g., "root.garage") or empty string if at root level
 *
 * @example
 * getParentPath("root.garage.shelf_a") // returns "root.garage"
 * getParentPath("root.garage") // returns "root"
 * getParentPath("root") // returns ""
 */
export function getParentPath(path: string): string {
  const segments = path.split(".");
  if (segments.length <= 1) {
    return "";
  }
  return segments.slice(0, -1).join(".");
}

/**
 * Regenerates ltree path with new name while preserving parent hierarchy.
 *
 * @param oldPath - Current ltree path
 * @param newName - New location name
 * @returns New ltree path with updated last segment
 *
 * @example
 * regeneratePath("root.garage.shelf_a", "Top Shelf") // returns "root.garage.top_shelf"
 */
export function regeneratePath(oldPath: string, newName: string): string {
  const parentPath = getParentPath(oldPath);
  const newSlug = slugify(newName);

  if (!parentPath) {
    return newSlug;
  }

  return `${parentPath}.${newSlug}`;
}

/**
 * Builds ltree path for a location based on parent path and normalized name.
 *
 * @param parentPath - Parent location's path, or null for root location
 * @param normalizedName - Normalized location name
 * @returns Complete ltree path for the location
 *
 * @example
 * buildLocationPath(null, "garage") // returns "root.garage"
 * buildLocationPath("root.garage", "shelf_a") // returns "root.garage.shelf_a"
 */
export function buildLocationPath(parentPath: string | null, normalizedName: string): string {
  if (!parentPath) {
    return `root.${normalizedName}`;
  }
  return `${parentPath}.${normalizedName}`;
}

/**
 * Calculates the depth of a location path by counting segments.
 *
 * @param path - The ltree path string
 * @returns Depth level (number of segments)
 *
 * @example
 * getPathDepth("root.garage") // returns 2
 * getPathDepth("root.garage.shelf_a.section_1") // returns 4
 */
export function getPathDepth(path: string): number {
  return path.split(".").length;
}

/**
 * Checks if a sibling location with the same name already exists.
 *
 * @param supabase - Supabase client instance
 * @param workspaceId - Workspace ID to check within
 * @param currentPath - Current location's ltree path
 * @param newName - Proposed new name
 * @param excludeId - Location ID to exclude from conflict check (the location being updated)
 * @returns Promise resolving to true if conflict exists, false otherwise
 */
async function checkSiblingNameConflict(
  supabase: SupabaseClient,
  workspaceId: string,
  currentPath: string,
  newName: string,
  excludeId: string
): Promise<boolean> {
  const parentPath = getParentPath(currentPath);
  const newSlug = slugify(newName);
  const newPath = parentPath ? `${parentPath}.${newSlug}` : newSlug;

  const { data: siblings } = await supabase
    .from("locations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false)
    .eq("path", newPath)
    .neq("id", excludeId);

  return siblings !== null && siblings.length > 0;
}

/**
 * Creates a new location in the hierarchical storage structure.
 *
 * Uses a SECURITY DEFINER function to bypass RLS policies, which is necessary
 * when using custom session cookie authentication where auth.uid() is not available.
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user's ID
 * @param request - Location creation request data
 * @returns Created location DTO
 *
 * @throws {WorkspaceMembershipError} User is not a member of the workspace
 * @throws {ParentNotFoundError} Parent location doesn't exist or belongs to different workspace
 * @throws {MaxDepthExceededError} Location would exceed maximum hierarchy depth of 5
 * @throws {SiblingConflictError} Location with same name already exists at this level
 */
export async function createLocation(
  supabase: SupabaseClient,
  userId: string,
  request: CreateLocationRequest
): Promise<LocationDto> {
  const { workspace_id, name, description, parent_id } = request;

  try {
    // Use SECURITY DEFINER function to bypass RLS
    // This handles membership check, path generation, depth validation, and conflict check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: locationId, error: createError } = await (supabase.rpc as any)("create_location_for_user", {
      p_user_id: userId,
      p_workspace_id: workspace_id,
      p_name: name,
      p_description: description || null,
      p_parent_id: parent_id || null,
    });

    if (createError) {
      const errorMessage = createError.message || "";

      // Map database errors to appropriate exceptions
      if (errorMessage.includes("not a member")) {
        throw new WorkspaceMembershipError();
      }
      if (errorMessage.includes("Parent location not found")) {
        throw new ParentNotFoundError();
      }
      if (errorMessage.includes("Maximum location depth exceeded")) {
        throw new MaxDepthExceededError();
      }
      if (errorMessage.includes("already exists at this level")) {
        throw new SiblingConflictError();
      }

      log.error("Failed to create location via RPC", {
        workspaceId: workspace_id,
        name,
        error: createError.message,
        code: createError.code,
      });
      throw new Error("Nie udało się utworzyć lokalizacji");
    }

    if (!locationId) {
      throw new Error("Nie udało się utworzyć lokalizacji - brak ID");
    }

    // Fetch the created location to return full data
    // Use direct query since we just created it and know it exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: locations, error: fetchError } = await (supabase.rpc as any)("get_workspace_locations", {
      p_user_id: userId,
      p_workspace_id: workspace_id,
    });

    if (fetchError) {
      log.error("Failed to fetch created location", {
        locationId,
        error: fetchError.message,
      });
      // Return minimal data since creation succeeded
      return {
        id: locationId,
        workspace_id,
        name,
        description: description || null,
        path: "",
        parent_id: parent_id || null,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Find the newly created location in the results
    interface LocationRow {
      id: string;
      workspace_id: string;
      path: string;
      name: string;
      description: string | null;
      is_deleted: boolean;
      created_at: string;
      updated_at: string;
    }
    const newLocation = (locations || []).find((loc: { id: string }) => loc.id === locationId) as
      | LocationRow
      | undefined;

    if (!newLocation) {
      // Return minimal data since creation succeeded
      return {
        id: locationId,
        workspace_id,
        name,
        description: description || null,
        path: "",
        parent_id: parent_id || null,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Prepare response
    const locationDto: LocationDto = {
      id: newLocation.id,
      workspace_id: newLocation.workspace_id,
      name: newLocation.name,
      description: newLocation.description,
      path: newLocation.path,
      parent_id: parent_id || null,
      is_deleted: newLocation.is_deleted,
      created_at: newLocation.created_at,
      updated_at: newLocation.updated_at,
    };

    return locationDto;
  } catch (error) {
    // Re-throw known errors
    if (
      error instanceof WorkspaceMembershipError ||
      error instanceof ParentNotFoundError ||
      error instanceof MaxDepthExceededError ||
      error instanceof SiblingConflictError
    ) {
      throw error;
    }

    log.error("Unexpected error in createLocation", {
      workspaceId: workspace_id,
      name,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof Error ? error : new Error("Nie udało się utworzyć lokalizacji");
  }
}

/**
 * Retrieves all locations for a specific workspace with optional parent filtering.
 * Supports hierarchical lazy loading by filtering direct children of a parent location.
 *
 * Uses a SECURITY DEFINER function to bypass RLS policies, which is necessary
 * when using custom session cookie authentication where auth.uid() is not available.
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user's ID
 * @param workspaceId - The UUID of the workspace to query
 * @param parentId - Optional parent location ID to filter children (null/undefined for root locations)
 * @returns Promise resolving to array of LocationDto objects
 *
 * @throws {Error} Database query fails
 *
 * @example
 * // Get root-level locations
 * const rootLocations = await getLocations(supabase, userId, workspaceId);
 *
 * @example
 * // Get children of specific parent
 * const children = await getLocations(supabase, userId, workspaceId, parentId);
 */
export async function getLocations(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  parentId?: string | null
): Promise<LocationDto[]> {
  try {
    // Use SECURITY DEFINER function to bypass RLS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("get_workspace_locations", {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_parent_id: parentId || null,
    });

    if (error) {
      const errorMessage = error.message || "";

      if (errorMessage.includes("not a member")) {
        throw new WorkspaceMembershipError("Nie masz uprawnień do przeglądania lokalizacji w tej przestrzeni roboczej");
      }

      log.error("Failed to fetch locations via RPC", {
        workspaceId,
        error: error.message,
        code: error.code,
      });
      throw new Error("Nie udało się pobrać lokalizacji");
    }

    // Cast the data to the expected type
    interface LocationRow {
      id: string;
      workspace_id: string;
      path: string;
      name: string;
      description: string | null;
      is_deleted: boolean;
      created_at: string;
      updated_at: string;
    }
    const locations = (data || []) as LocationRow[];

    // Filter by hierarchy depth client-side
    let filteredData = locations;

    if (parentId === undefined || parentId === null) {
      // Root-level locations have depth 2 (e.g., "root.garage")
      filteredData = locations.filter((loc) => {
        const pathSegments = loc.path.split(".");
        return pathSegments.length === 2;
      });
    } else {
      // Find parent path first
      const parent = locations.find((loc) => loc.id === parentId);
      if (parent) {
        const parentPath = parent.path;
        const parentDepth = parentPath.split(".").length;
        const targetDepth = parentDepth + 1;

        filteredData = locations.filter((loc) => {
          const pathSegments = loc.path.split(".");
          return pathSegments.length === targetDepth && loc.path.startsWith(`${parentPath}.`);
        });
      } else {
        throw new ParentNotFoundError();
      }
    }

    // Build parent path to ID map for deriving parent_id
    const pathToIdMap = new Map<string, string>();
    locations.forEach((loc) => {
      pathToIdMap.set(loc.path, loc.id);
    });

    // Transform to LocationDto format with parent_id
    return filteredData.map((location) => {
      const pathSegments = location.path.split(".");
      let derivedParentId: string | null = null;

      // For non-root locations, derive parent_id from path
      if (pathSegments.length > 2) {
        const parentPath = pathSegments.slice(0, -1).join(".");
        derivedParentId = pathToIdMap.get(parentPath) || null;
      }

      const locationDto: LocationDto = {
        id: location.id,
        workspace_id: location.workspace_id,
        name: location.name,
        description: location.description,
        path: location.path,
        parent_id: derivedParentId,
        is_deleted: location.is_deleted,
        created_at: location.created_at,
        updated_at: location.updated_at,
      };

      return locationDto;
    });
  } catch (error) {
    // Re-throw known errors
    if (error instanceof WorkspaceMembershipError || error instanceof ParentNotFoundError) {
      throw error;
    }

    log.error("Unexpected error in getLocations", {
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof Error ? error : new Error("Nie udało się pobrać lokalizacji");
  }
}

/**
 * Updates an existing location's name and/or description.
 * When the name is updated, the ltree path is regenerated to maintain hierarchy integrity.
 *
 * @param supabase - Supabase client instance
 * @param locationId - UUID of the location to update
 * @param userId - Authenticated user's ID
 * @param data - Update data containing optional name and/or description
 * @returns Promise resolving to updated location response
 *
 * @throws {NotFoundError} Location doesn't exist, is deleted, or user lacks access
 * @throws {ConflictError} New name conflicts with existing sibling location
 *
 * @example
 * const updated = await updateLocation(supabase, locationId, userId, { name: "New Name" });
 */
export async function updateLocation(
  supabase: SupabaseClient,
  locationId: string,
  userId: string,
  data: UpdateLocationRequest
): Promise<UpdateLocationResponse> {
  // Step 1: Fetch current location
  const { data: location, error: fetchError } = await supabase
    .from("locations")
    .select("id, workspace_id, name, description, path, is_deleted")
    .eq("id", locationId)
    .single();

  // Handle fetch errors
  if (fetchError || !location) {
    throw new NotFoundError("Location not found");
  }

  // Check soft delete
  if (location.is_deleted) {
    throw new NotFoundError("Location not found");
  }

  // Step 2: Check for name conflicts (if name is changing)
  if (data.name && data.name !== location.name) {
    const conflictExists = await checkSiblingNameConflict(
      supabase,
      location.workspace_id,
      location.path as string,
      data.name,
      locationId
    );

    if (conflictExists) {
      throw new ConflictError("A location with this name already exists at this level");
    }
  }

  // Step 3: Prepare update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;

  // Step 4: Handle path regeneration if name changes
  if (data.name && data.name !== location.name) {
    const newPath = regeneratePath(location.path as string, data.name);
    updateData.path = newPath;
  }

  // Step 5: Execute update
  const { data: updated, error: updateError } = await supabase
    .from("locations")
    .update(updateData)
    .eq("id", locationId)
    .select("id, name, description, updated_at")
    .single();

  // Handle update errors
  if (updateError) {
    // RLS might block access - return 404 to avoid info disclosure
    if (updateError.code === "PGRST116") {
      throw new NotFoundError("Location not found");
    }

    log.error("Failed to update location", { locationId, error: updateError.message, code: updateError.code });
    throw new Error("Failed to update location");
  }

  // Step 6: Return formatted response
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    updated_at: updated.updated_at,
  };
}

/**
 * Soft deletes a location and unassigns all boxes from it.
 * This is a soft delete operation - the location is marked as deleted (is_deleted = true)
 * rather than being physically removed from the database. All boxes assigned to this
 * location are automatically unassigned (location_id set to NULL).
 *
 * @param supabase - Supabase client instance
 * @param locationId - UUID of the location to delete
 * @param userId - ID of the authenticated user (for audit logging)
 * @returns Promise resolving to void on success
 *
 * @throws {NotFoundError} Location doesn't exist, is already deleted, or user lacks access (RLS)
 * @throws {Error} Database operation fails
 *
 * @example
 * await deleteLocation(supabase, locationId, userId);
 */
export async function deleteLocation(supabase: SupabaseClient, locationId: string, userId: string): Promise<void> {
  // Step 1: Verify location exists and user has access (RLS enforced)
  const { data: location, error: fetchError } = await supabase
    .from("locations")
    .select("id, workspace_id, is_deleted")
    .eq("id", locationId)
    .single();

  // Handle fetch errors or missing location
  if (fetchError || !location) {
    log.error("Location not found for deletion", { locationId, userId, error: fetchError?.message });
    throw new NotFoundError("Lokalizacja nie została znaleziona");
  }

  // Check if already soft-deleted
  if (location.is_deleted) {
    log.warn("Location already deleted", { locationId, userId });
    throw new NotFoundError("Lokalizacja nie została znaleziona");
  }

  // Step 2: Execute soft delete transaction
  // First, unassign all boxes from this location
  const { error: unassignError } = await supabase
    .from("boxes")
    .update({ location_id: null })
    .eq("location_id", locationId);

  if (unassignError) {
    log.error("Failed to unassign boxes from location", {
      locationId,
      userId,
      error: unassignError.message,
      code: unassignError.code,
    });
    throw new Error("Nie udało się usunąć lokalizacji");
  }

  // Second, mark location as deleted
  const { error: deleteError } = await supabase.from("locations").update({ is_deleted: true }).eq("id", locationId);

  if (deleteError) {
    log.error("Failed to mark location as deleted", {
      locationId,
      userId,
      error: deleteError.message,
      code: deleteError.code,
    });
    throw new Error("Nie udało się usunąć lokalizacji");
  }

  // Success - log for audit trail
  log.info("Location deleted successfully", { locationId, userId, workspaceId: location.workspace_id });
}

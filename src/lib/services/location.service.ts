import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateLocationRequest, LocationDto, UpdateLocationRequest, UpdateLocationResponse } from "@/types";

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
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, "_") // Replace non-alphanumeric (except _) with _
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
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

  // Step 1: Validate workspace membership
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspace_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    console.error("Error checking workspace membership:", membershipError);
    throw new Error("Nie udało się sprawdzić członkostwa w przestrzeni roboczej");
  }

  if (!membership) {
    throw new WorkspaceMembershipError();
  }

  // Step 2: Validate parent location if provided
  let parentPath: string | null = null;

  if (parent_id) {
    const { data: parent, error: parentError } = await supabase
      .from("locations")
      .select("id, workspace_id, path, is_deleted")
      .eq("id", parent_id)
      .maybeSingle();

    if (parentError) {
      console.error("Error fetching parent location:", parentError);
      throw new Error("Nie udało się pobrać lokalizacji nadrzędnej");
    }

    if (!parent) {
      throw new ParentNotFoundError();
    }

    // Verify parent belongs to same workspace
    if (parent.workspace_id !== workspace_id) {
      throw new ParentNotFoundError();
    }

    // Verify parent is not soft-deleted
    if (parent.is_deleted) {
      throw new ParentNotFoundError();
    }

    parentPath = parent.path as string;
  }

  // Step 3: Check hierarchy depth
  const normalizedName = normalizeLocationName(name);
  const targetPath = buildLocationPath(parentPath, normalizedName);
  const targetDepth = getPathDepth(targetPath);

  if (targetDepth > 5) {
    throw new MaxDepthExceededError();
  }

  // Step 4: Check for sibling name conflicts
  const { data: existingLocation, error: conflictError } = await supabase
    .from("locations")
    .select("id")
    .eq("workspace_id", workspace_id)
    .eq("path", targetPath)
    .eq("is_deleted", false)
    .maybeSingle();

  if (conflictError) {
    console.error("Error checking for sibling conflicts:", conflictError);
    throw new Error("Nie udało się sprawdzić unikalności nazwy lokalizacji");
  }

  if (existingLocation) {
    throw new SiblingConflictError();
  }

  // Step 5: Create location
  const { data: newLocation, error: insertError } = await supabase
    .from("locations")
    .insert({
      workspace_id,
      path: targetPath,
      name,
      description: description || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting location:", insertError);
    throw new Error("Nie udało się utworzyć lokalizacji");
  }

  // Step 6: Prepare response
  // Convert ltree path to string and derive parent_id
  const locationDto: LocationDto = {
    id: newLocation.id,
    workspace_id: newLocation.workspace_id,
    name: newLocation.name,
    description: newLocation.description,
    path: newLocation.path as string,
    parent_id: parent_id || null,
    is_deleted: newLocation.is_deleted,
    created_at: newLocation.created_at,
    updated_at: newLocation.updated_at,
  };

  return locationDto;
}

/**
 * Retrieves all locations for a specific workspace with optional parent filtering.
 * Supports hierarchical lazy loading by filtering direct children of a parent location.
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
  // Step 1: Validate workspace membership
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    console.error("Error checking workspace membership:", membershipError);
    throw new Error("Nie udało się sprawdzić członkostwa w przestrzeni roboczej");
  }

  if (!membership) {
    throw new WorkspaceMembershipError("Nie masz uprawnień do przeglądania lokalizacji w tej przestrzeni roboczej");
  }

  // Step 2: Build base query
  let query = supabase
    .from("locations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false)
    .order("name", { ascending: true });

  // Step 3: Apply hierarchical filtering
  if (parentId === undefined || parentId === null) {
    // Get root-level locations (depth = 2: "root.location_name")
    // Filter for paths that match "root.%" but not "root.%.%"
    // This ensures we get only direct children of root
    query = query.like("path", "root.%").not("path", "like", "root.%.%");
  } else {
    // Get direct children of specific parent
    // First fetch parent to get its path
    const { data: parent, error: parentError } = await supabase
      .from("locations")
      .select("path")
      .eq("id", parentId)
      .eq("is_deleted", false)
      .maybeSingle();

    if (parentError) {
      console.error("Error fetching parent location:", parentError);
      throw new Error("Nie udało się pobrać lokalizacji nadrzędnej");
    }

    if (!parent) {
      throw new ParentNotFoundError();
    }

    const parentPath = parent.path as string;

    // Filter for direct children: parent_path.% but not parent_path.%.%
    query = query.like("path", `${parentPath}.%`).not("path", "like", `${parentPath}.%.%`);
  }

  // Step 4: Execute query
  const { data, error } = await query;

  if (error) {
    console.error("Database error fetching locations:", error);
    throw new Error("Nie udało się pobrać lokalizacji");
  }

  // Step 5: Derive parent_id for all locations
  // Build a map of parent paths to fetch parent IDs in a single query
  const parentPathsToFetch = new Set<string>();
  const locationDataMap = new Map();

  data.forEach((location) => {
    const path = location.path as string;
    const pathSegments = path.split(".");

    locationDataMap.set(location.id, { location, path, pathSegments });

    // For non-root locations (depth > 2), we need to find parent_id
    if (pathSegments.length > 2) {
      // Parent path is all segments except the last one
      const parentPath = pathSegments.slice(0, -1).join(".");
      parentPathsToFetch.add(parentPath);
    }
  });

  // Step 6: Fetch all parent IDs in a single query (if needed)
  const parentPathToIdMap = new Map<string, string>();

  if (parentPathsToFetch.size > 0) {
    const { data: parentLocations, error: parentQueryError } = await supabase
      .from("locations")
      .select("id, path")
      .eq("workspace_id", workspaceId)
      .in("path", Array.from(parentPathsToFetch));

    if (parentQueryError) {
      console.error("Error fetching parent locations:", parentQueryError);
      throw new Error("Nie udało się pobrać informacji o lokalizacjach nadrzędnych");
    }

    // Build map of parent path -> parent ID
    parentLocations?.forEach((parent) => {
      parentPathToIdMap.set(parent.path as string, parent.id);
    });
  }

  // Step 7: Transform data to LocationDto format with parent_id
  return data.map((location) => {
    const { path, pathSegments } = locationDataMap.get(location.id);
    let derivedParentId: string | null = null;

    // For non-root locations, look up parent_id from the map
    if (pathSegments.length > 2) {
      const parentPath = pathSegments.slice(0, -1).join(".");
      derivedParentId = parentPathToIdMap.get(parentPath) || null;
    }

    const locationDto: LocationDto = {
      id: location.id,
      workspace_id: location.workspace_id,
      name: location.name,
      description: location.description,
      path: path,
      parent_id: derivedParentId,
      is_deleted: location.is_deleted,
      created_at: location.created_at,
      updated_at: location.updated_at,
    };

    return locationDto;
  });
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

    console.error("Database error updating location:", updateError);
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

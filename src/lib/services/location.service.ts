import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateLocationRequest, LocationDto } from "@/types";

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

  // Step 5: Transform data to LocationDto format
  // Convert path to string and derive parent_id from path structure
  return data.map((location) => {
    const path = location.path as string;
    const pathSegments = path.split(".");
    let derivedParentId: string | null = null;

    // For non-root locations, parent_id is provided in the query
    // For root locations, parent_id is null
    if (pathSegments.length > 2 && parentId) {
      derivedParentId = parentId;
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

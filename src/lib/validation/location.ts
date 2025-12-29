import { z } from "zod";
import { CommonValidation } from "./schemas";

/**
 * Location-specific validation schemas.
 * Used for location creation and updates.
 * Includes hierarchical depth validation.
 */

// ============= LOCATION HIERARCHY LIMITS =============

const MAX_LOCATION_DEPTH = 5;
const MAX_LOCATIONS_PER_LEVEL = 100;

// ============= LOCATION CREATION & UPDATE =============

export const createLocationSchema = z.object({
  workspace_id: CommonValidation.uuid,
  name: CommonValidation.locationName,
  description: CommonValidation.descriptionSchema,
  parent_id: CommonValidation.uuid.nullable().optional(),
});

export type CreateLocationData = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = z.object({
  name: CommonValidation.locationName.optional(),
  description: CommonValidation.descriptionSchema.optional(),
});

export type UpdateLocationData = z.infer<typeof updateLocationSchema>;

// ============= LOCATION HIERARCHY VALIDATION =============

/**
 * Validate that location doesn't exceed maximum depth
 * This should be checked client-side for UX and server-side for security
 */
export function validateLocationDepth(currentDepth: number): boolean {
  return currentDepth < MAX_LOCATION_DEPTH;
}

/**
 * Get depth validation error message
 */
export function getDepthErrorMessage(): string {
  return `Maksymalna głębokość hierarchii to ${MAX_LOCATION_DEPTH} poziomów`;
}

/**
 * Validate location data exists and has required fields
 */
export function validateLocationData(data: unknown): data is { id: string; name: string } {
  try {
    const schema = z.object({
      id: CommonValidation.uuid,
      name: CommonValidation.locationName,
    });
    schema.parse(data);
    return true;
  } catch {
    return false;
  }
}

// ============= LOCATION PATH VALIDATION =============

/**
 * Validate ltree path format (e.g., "root.basement.shelf_a")
 */
export const locationPathSchema = z
  .string()
  .regex(/^[a-z0-9_.]+$/, "Invalid location path format")
  .optional();

export type LocationPath = z.infer<typeof locationPathSchema>;

/**
 * Parse location path into breadcrumb array
 */
export function parseLocationPath(path: string): string[] {
  return path.split(".").filter((p) => p && p !== "root");
}

/**
 * Build breadcrumb display string from path
 */
export function buildLocationBreadcrumb(path: string | undefined): string {
  if (!path) return "Unassigned";

  const parts = parseLocationPath(path);
  if (parts.length === 0) return "Root";

  return parts.join(" > ");
}

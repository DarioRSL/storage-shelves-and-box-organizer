import { z } from "zod";
import { CommonValidation } from "./schemas";

/**
 * Box-specific validation schemas.
 * Used for box creation, updates, and search queries.
 */

// ============= BOX CREATION & UPDATE =============

export const createBoxSchema = z.object({
  workspace_id: CommonValidation.uuid,
  name: CommonValidation.boxName,
  description: CommonValidation.descriptionSchema,
  tags: CommonValidation.tagsSchema,
  location_id: CommonValidation.uuid.nullable().optional(),
  qr_code_id: CommonValidation.uuid.nullable().optional(),
});

export type CreateBoxData = z.infer<typeof createBoxSchema>;

export const updateBoxSchema = z.object({
  name: CommonValidation.boxName.optional(),
  description: CommonValidation.descriptionSchema.optional(),
  tags: CommonValidation.tagsSchema.optional(),
  location_id: CommonValidation.uuid.nullable().optional(),
  qr_code_id: CommonValidation.uuid.nullable().optional(),
});

export type UpdateBoxData = z.infer<typeof updateBoxSchema>;

// ============= BOX SEARCH & FILTERING =============

export const searchBoxesSchema = z.object({
  workspace_id: CommonValidation.uuid,
  q: CommonValidation.searchQuerySchema,
  location_id: CommonValidation.uuid.nullable().optional(),
  limit: z.number().int().min(1).max(100).default(50).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});

export type SearchBoxesData = z.infer<typeof searchBoxesSchema>;

// ============= BOX VALIDATION UTILITIES =============

/**
 * Validate box data exists and has required fields
 */
export function validateBoxData(data: unknown): data is { id: string; name: string; workspace_id: string } {
  try {
    const schema = z.object({
      id: CommonValidation.uuid,
      name: CommonValidation.boxName,
      workspace_id: CommonValidation.uuid,
    });
    schema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate tag and build tag list
 */
export function validateAndParseTags(tags: unknown): string[] {
  try {
    const parsed = CommonValidation.tags.parse(tags);
    return parsed || [];
  } catch {
    return [];
  }
}

/**
 * Format tags for display (comma-separated)
 */
export function formatTagsForDisplay(tags: string[] | null | undefined): string {
  if (!tags || tags.length === 0) return "No tags";
  return tags.join(", ");
}

/**
 * Parse comma-separated tags string into array
 */
export function parseTagsFromString(tagsString: string): string[] {
  return tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

// ============= BOX SEARCH VALIDATION =============

/**
 * Validate search query length
 */
export function isValidSearchQuery(query: string): boolean {
  const trimmed = query.trim();
  return trimmed.length === 0 || trimmed.length >= 3;
}

/**
 * Get search query validation error
 */
export function getSearchQueryErrorMessage(): string {
  return "Search query must be at least 3 characters";
}

/**
 * Format search result count message
 */
export function formatSearchResultsMessage(count: number, query?: string): string {
  if (count === 0) {
    return query ? `No results found for "${query}"` : "No boxes found";
  }
  if (count === 1) {
    return query ? `Found 1 result for "${query}"` : "Found 1 box";
  }
  return query ? `Found ${count} results for "${query}"` : `Found ${count} boxes`;
}

// ============= BOX LOCATION ASSIGNMENT =============

/**
 * Validate that box can be assigned to location
 * (i.e., location exists and is in same workspace)
 */
export function validateLocationAssignment(boxWorkspaceId: string, locationWorkspaceId: string): boolean {
  return boxWorkspaceId === locationWorkspaceId;
}

/**
 * Validate that box can be assigned QR code
 * (i.e., QR code exists and is in same workspace)
 */
export function validateQrCodeAssignment(boxWorkspaceId: string, qrCodeWorkspaceId: string): boolean {
  return boxWorkspaceId === qrCodeWorkspaceId;
}

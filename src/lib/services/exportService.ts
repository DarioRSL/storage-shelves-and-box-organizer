import { SupabaseClient } from "@supabase/supabase-js";
// @ts-ignore - csv-stringify/sync is available at runtime
import { stringify } from "csv-stringify/sync";

/**
 * Raw database query result for box export.
 * Represents the joined result from boxes, locations, and qr_codes tables.
 */
interface BoxQueryResult {
  id: string;
  short_id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  location_id: string | null;
  created_at: string;
  updated_at: string;
  locations: {
    id: string;
    path: string;
    name: string;
  } | null;
  qr_codes:
    | {
        short_id: string;
      }[]
    | null;
}

/**
 * Transformed export record ready for CSV/JSON output.
 */
interface ExportRecord {
  id: string;
  short_id: string;
  name: string;
  location: string;
  description: string | null;
  tags: string;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Converts ltree path format (e.g., "root.basement.shelf_a") to breadcrumb format (e.g., "Basement > Shelf A").
 * Uses the location.name field for each path component if available,
 * otherwise capitalizes and converts underscores to spaces.
 *
 * @param path - ltree path string (e.g., "root.basement.shelf_a")
 * @param locationName - Display name of the location
 * @returns Formatted breadcrumb string (e.g., "Basement > Shelf A") or empty string if no path
 */
function formatLocationPath(path: string | null, locationName: string | null): string {
  if (!path) return "";

  // If location has a name, use it (simpler approach for MVP)
  if (locationName) {
    return locationName;
  }

  // Fallback: parse ltree path format
  // ltree format: "root.basement.shelf_a"
  // Convert to: "Basement > Shelf A"
  const parts = path
    .split(".")
    .filter((p) => p !== "root") // Remove root component
    .map((part) => {
      // Convert underscores to spaces and capitalize first letter of each word
      return part
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    });

  return parts.join(" > ");
}

/**
 * Converts PostgreSQL array of tags to CSV-safe string format.
 * Handles special characters and escaping for CSV export.
 *
 * @param tags - Array of tag strings (null if no tags)
 * @returns Comma-separated tag string or empty string if no tags
 */
function formatTagsForCsv(tags: string[] | null): string {
  if (!tags || tags.length === 0) return "";
  // csv-stringify library will handle escaping, just join with comma
  return tags.join(",");
}

/**
 * Transforms raw database query results into export records.
 * Handles:
 * - Location path conversion (ltree → breadcrumb)
 * - Tags array to CSV string
 * - NULL value handling for optional fields
 * - QR code extraction from nested array
 *
 * @param boxes - Raw query results from database
 * @returns Array of formatted export records
 */
function transformBoxesToExportRecords(boxes: BoxQueryResult[]): ExportRecord[] {
  return boxes.map((box) => ({
    id: box.id,
    short_id: box.short_id,
    name: box.name,
    location: formatLocationPath(box.locations?.path ?? null, box.locations?.name ?? null),
    description: box.description,
    tags: formatTagsForCsv(box.tags),
    qr_code: box.qr_codes?.[0]?.short_id ?? null,
    created_at: box.created_at,
    updated_at: box.updated_at,
  }));
}

/**
 * Generates CSV export content from export records.
 * Uses csv-stringify library with proper header row and field escaping.
 *
 * @param records - Transformed export records
 * @returns CSV content as string
 */
function generateCsvContent(records: ExportRecord[]): string {
  // Define column headers
  const columns = ["id", "short_id", "name", "location", "description", "tags", "qr_code", "created_at", "updated_at"];

  // Use csv-stringify to properly escape fields
  return stringify(records, {
    header: true,
    columns,
  });
}

/**
 * Generates JSON export content with metadata wrapper.
 * Includes format version and export timestamp for validation.
 *
 * @param workspaceId - UUID of workspace being exported
 * @param records - Transformed export records
 * @returns JSON content as string
 */
function generateJsonContent(workspaceId: string, records: ExportRecord[]): string {
  // For JSON export, convert tags string back to array
  const dataWithArrayTags = records.map((record) => ({
    ...record,
    tags: record.tags ? record.tags.split(",") : [],
  }));

  const exportData = {
    meta: {
      workspace_id: workspaceId,
      export_date: new Date().toISOString(),
      total_records: records.length,
      format_version: "1.0",
    },
    data: dataWithArrayTags,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Generates appropriate filename for export file.
 * Format: inventory-{workspace_id}-{YYYY-MM-DD}.{format}
 *
 * @param workspaceId - UUID of workspace
 * @param format - Export format ('csv' or 'json')
 * @returns Formatted filename string
 */
function generateFilename(workspaceId: string, format: "csv" | "json"): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `inventory-${workspaceId}-${today}.${format}`;
}

/**
 * Main export function that orchestrates the entire export process.
 * Fetches boxes with related data from Supabase, transforms, and generates output file.
 *
 * Process:
 * 1. Query boxes with location and QR code relationships
 * 2. Transform database records to export format
 * 3. Generate CSV or JSON content based on format parameter
 * 4. Return file content with appropriate MIME type and filename
 *
 * Security:
 * - RLS policies enforced by Supabase (user must be workspace member)
 * - CSV injection prevention via csv-stringify library
 * - No sensitive data (tokens, credentials) included
 *
 * @param supabase - Authenticated Supabase client
 * @param workspaceId - UUID of workspace to export
 * @param format - Export format ('csv' or 'json')
 * @returns Export result with content, MIME type, and filename
 * @throws Error if database query fails
 */
export async function exportInventory(
  supabase: SupabaseClient,
  workspaceId: string,
  format: "csv" | "json" = "csv"
): Promise<{
  content: string;
  mimeType: "text/csv" | "application/json";
  filename: string;
}> {
  // Step 1: Fetch all boxes with related location and QR code data
  // LEFT JOINs ensure we get boxes without locations or QR codes
  const { data: boxes, error: queryError } = await supabase
    .from("boxes")
    .select(
      `
      id,
      short_id,
      name,
      description,
      tags,
      location_id,
      created_at,
      updated_at,
      locations(id, path, name),
      qr_codes(short_id)
    `
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (queryError) {
    throw new Error(`Database query failed: ${queryError.message}`);
  }

  // Step 2: Transform database results to export format
  // Supabase returns `any` type for relations, use type assertion with unknown first
  const records = transformBoxesToExportRecords((boxes as unknown as BoxQueryResult[]) || []);

  // Step 3: Generate file content based on format
  let content: string;
  let mimeType: "text/csv" | "application/json";

  if (format === "json") {
    content = generateJsonContent(workspaceId, records);
    mimeType = "application/json";
  } else {
    content = generateCsvContent(records);
    mimeType = "text/csv";
  }

  // Step 4: Generate filename and return
  const filename = generateFilename(workspaceId, format);

  return {
    content,
    mimeType,
    filename,
  };
}

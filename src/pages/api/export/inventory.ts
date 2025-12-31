import type { APIContext } from "astro";
import { exportInventory } from "@/lib/services/exportService";
import { ExportInventoryQuerySchema } from "@/lib/validators/export.validators";
import type { ErrorResponse } from "@/types";

export const prerender = false;

/**
 * GET /api/export/inventory
 *
 * Exports all boxes from a workspace in CSV or JSON format.
 *
 * Query Parameters:
 * - workspace_id (required): UUID of workspace to export
 * - format (optional): 'csv' or 'json' (default: 'csv')
 *
 * Returns:
 * - 200: File download with appropriate Content-Type and Content-Disposition headers
 * - 400: Invalid query parameters (missing workspace_id, invalid format)
 * - 401: Not authenticated (no valid JWT token)
 * - 403: Not authorized (user is not workspace member)
 * - 404: Workspace not found
 * - 500: Server error during export
 *
 * Authentication: Required (JWT token from Authorization header)
 * Authorization: User must be member of the workspace
 *
 * Example:
 * GET /api/export/inventory?workspace_id=550e8400-e29b-41d4-a716-446655440000&format=csv
 * Authorization: Bearer <JWT_TOKEN>
 */
export async function GET(context: APIContext) {
  const supabase = context.locals.supabase;

  try {
    // --- Step 1: Verify Authentication ---
    // Use authenticated user from context.locals (already validated by middleware)
    const user = context.locals.user;

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "Nie jesteś uwierzytelniony",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // --- Step 2: Parse and Validate Query Parameters ---
    // Extract query parameters from URL
    const queryParams = Object.fromEntries(context.url.searchParams);

    // Validate against schema (handles UUID format, format enum, defaults)
    const validationResult = ExportInventoryQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      // Extract first validation error for user-friendly message
      const firstError = validationResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: firstError.message || "Nieprawidłowe parametry zapytania",
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { workspace_id, format } = validationResult.data;

    // --- Step 3: Verify Workspace Exists (Early Authorization Check) ---
    // This catches deleted workspaces and prevents export from non-existent workspaces
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return new Response(
        JSON.stringify({
          error: "Workspace nie został znaleziony",
        } as ErrorResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // --- Step 4: Verify User is Workspace Member (Authorization Check) ---
    // Explicit check to ensure user has access to this workspace
    // This is enforced by RLS policies in the database as well
    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({
          error: "Brak uprawnień: nie jesteś członkiem tego workspace'u",
        } as ErrorResponse),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // --- Step 5: Generate Export ---
    // Call the export service to fetch boxes and generate file content
    const result = await exportInventory(supabase, workspace_id, format as "csv" | "json");

    // --- Step 6: Log successful export (for monitoring) ---
    console.info("[GET /api/export/inventory] Success", {
      userId: user?.id,
      workspaceId: workspace_id,
      format,
      recordCount: result.content.split("\n").length - 1, // Approximate for monitoring
    });

    // --- Step 7: Return File Response ---
    // Stream file to client with proper headers for download
    return new Response(result.content, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": Buffer.byteLength(result.content).toString(),
        // Prevent caching since export contains current data
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    // --- Error Handling ---
    // Log error for debugging (without sensitive data)
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/export/inventory] Error", {
      workspaceId: context.url.searchParams.get("workspace_id"),
      error: errorMessage,
    });

    // Return generic error to client (don't expose implementation details)
    return new Response(
      JSON.stringify({
        error: "Nie udało się wyeksportować inwentarza: błąd serwera",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

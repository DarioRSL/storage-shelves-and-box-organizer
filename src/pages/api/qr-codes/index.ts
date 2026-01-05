import type { APIRoute } from "astro";
import { getQrCodesForWorkspace, isWorkspaceMember } from "@/lib/services/qr-code.service";
import type { ErrorResponse } from "@/types";
import { log } from "@/lib/services/logger";

export const prerender = false;

/**
 * GET /api/qr-codes
 * Retrieves QR codes for a workspace, optionally filtered by status.
 *
 * Query parameters:
 * - workspace_id (required): UUID of the workspace
 * - status (optional): Filter by status ('generated', 'assigned', 'printed')
 *
 * Returns 200 OK with array of QR codes.
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication
    const user = locals.user;

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "Brak autoryzacji",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Parse and validate query parameters
    const workspaceId = url.searchParams.get("workspace_id");
    const status = url.searchParams.get("status");

    if (!workspaceId) {
      return new Response(
        JSON.stringify({
          error: "workspace_id jest wymagane",
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(workspaceId)) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowy format workspace_id",
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate status if provided
    const validStatuses = ["generated", "assigned", "printed"];
    if (status && !validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({
          error: `Nieprawidłowy status. Dozwolone wartości: ${validStatuses.join(", ")}`,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Authorization: Check workspace membership
    const isMember = await isWorkspaceMember(supabase, workspaceId, user.id);

    if (!isMember) {
      return new Response(
        JSON.stringify({
          error: "Brak dostępu do tego workspace",
        } as ErrorResponse),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Fetch QR codes
    const qrCodes = await getQrCodesForWorkspace(supabase, workspaceId, status || undefined);

    // 6. Return QR codes
    return new Response(JSON.stringify(qrCodes), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    log.error("[GET /api/qr-codes] Unexpected error:", {
      error: error instanceof Error ? error.message : String(error)
    });

    return new Response(
      JSON.stringify({
        error: "Wewnętrzny błąd serwera",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

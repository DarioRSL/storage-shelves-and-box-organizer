import type { APIRoute } from "astro";
import { z, ZodError } from "zod";
import { getWorkspaceMembers } from "@/lib/services/workspace.service";
import { NotFoundError } from "@/lib/services/location.service";
import type { ErrorResponse } from "@/types";

export const prerender = false;

/**
 * Validates workspace_id URL parameter
 */
const paramsSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID workspace"),
});

/**
 * GET /api/workspaces/:workspace_id/members
 * Retrieves all members of a workspace with profile information.
 *
 * @returns 200 OK with array of workspace members, or appropriate error response
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // 1. Validate path parameters
    const validatedParams = paramsSchema.parse(params);
    const { workspace_id } = validatedParams;

    // 2. Get Supabase client from locals
    const supabase = locals.supabase;

    // 3. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // 4. Call service layer to get workspace members
    const members = await getWorkspaceMembers(supabase, workspace_id);

    // 5. Return 200 OK with members array
    return new Response(JSON.stringify(members), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle Zod validation errors (invalid UUID format)
    if (error instanceof ZodError) {
      const formattedErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        formattedErrors[path] = err.message;
      });

      return new Response(
        JSON.stringify({
          error: "Błąd walidacji",
          details: formattedErrors,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle NotFoundError (workspace not found or no access)
    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        } as ErrorResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle unexpected errors
    console.error("GET /api/workspaces/:workspace_id/members - Błąd:", {
      workspaceId: params.workspace_id,
      userId: locals.supabase ? "authenticated" : "unknown",
      error: error instanceof Error ? error.message : "Nieznany błąd",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Nie udało się pobrać członków workspace",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

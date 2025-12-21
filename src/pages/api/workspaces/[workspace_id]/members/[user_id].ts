import type { APIRoute } from "astro";
import { z, ZodError } from "zod";
import {
  InsufficientPermissionsError,
  InvalidOperationError,
  updateWorkspaceMemberRole,
} from "@/lib/services/workspace.service";
import { NotFoundError } from "@/lib/services/location.service";
import type { ErrorResponse } from "@/types";

export const prerender = false;

/**
 * Validates workspace_id and user_id URL parameters
 */
const paramsSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID workspace"),
  user_id: z.string().uuid("Nieprawidłowy format ID użytkownika"),
});

/**
 * Validates PATCH request body for updating member role
 */
const bodySchema = z.object({
  role: z.enum(["owner", "admin", "member", "read_only"], {
    errorMap: () => ({ message: "Nieprawidłowa rola" }),
  }),
});

/**
 * PATCH /api/workspaces/:workspace_id/members/:user_id
 * Updates a member's role in the workspace.
 *
 * @returns 200 OK with updated member data, or appropriate error response
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Validate path parameters
    const validatedParams = paramsSchema.parse(params);
    const { workspace_id, user_id } = validatedParams;

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

    // 4. Parse and validate request body
    const body = await request.json();
    const validatedBody = bodySchema.parse(body);
    const { role } = validatedBody;

    // 5. Call service layer to update member role
    const updatedMember = await updateWorkspaceMemberRole(supabase, workspace_id, user_id, user.id, role);

    // 6. Return 200 OK with updated member data
    return new Response(JSON.stringify(updatedMember), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle Zod validation errors
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

    // Handle insufficient permissions error (403)
    if (error instanceof InsufficientPermissionsError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        } as ErrorResponse),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle NotFoundError (404)
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

    // Handle invalid operation error (409)
    if (error instanceof InvalidOperationError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        } as ErrorResponse),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle unexpected errors
    console.error("PATCH /api/workspaces/:workspace_id/members/:user_id - Błąd:", {
      workspaceId: params.workspace_id,
      targetUserId: params.user_id,
      currentUserId: locals.supabase ? "authenticated" : "unknown",
      error: error instanceof Error ? error.message : "Nieznany błąd",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Nie udało się zaktualizować roli członka",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

import type { APIRoute } from "astro";
import { z, ZodError } from "zod";
import {
  InsufficientPermissionsError,
  InvalidOperationError,
  OwnerRemovalError,
  removeWorkspaceMember,
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

    // 3. Verify authentication using context.locals.user (already authenticated by middleware)
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
  } catch (_error) {
    // Handle Zod validation errors
    if (_error instanceof ZodError) {
      const formattedErrors: Record<string, string> = {};
      _error.errors.forEach((err) => {
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
    if (_error instanceof InsufficientPermissionsError) {
      return new Response(
        JSON.stringify({
          error: _error.message,
        } as ErrorResponse),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle NotFoundError (404)
    if (_error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: _error.message,
        } as ErrorResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle invalid operation error (409)
    if (_error instanceof InvalidOperationError) {
      return new Response(
        JSON.stringify({
          error: _error.message,
        } as ErrorResponse),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Error handled by middleware authentication

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

/**
 * DELETE /api/workspaces/:workspace_id/members/:user_id
 *
 * Removes a member from a workspace.
 *
 * Authorization:
 * - Any member can remove themselves (leave workspace)
 * - Owners and admins can remove other members
 * - Cannot remove workspace owner
 *
 * @returns 200 OK with success message, or appropriate error response
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // 1. Validate path parameters
    const validatedParams = paramsSchema.parse(params);
    const { workspace_id, user_id } = validatedParams;

    // 2. Get Supabase client from locals
    const supabase = locals.supabase;

    // 3. Verify authentication using context.locals.user (already authenticated by middleware)
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

    // 4. Call service layer to remove member
    await removeWorkspaceMember(supabase, workspace_id, user_id, user.id);

    // 5. Return 200 OK with success message
    return new Response(
      JSON.stringify({
        message: "Członek został pomyślnie usunięty",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (_error) {
    // Handle Zod validation errors
    if (_error instanceof ZodError) {
      const formattedErrors: Record<string, string> = {};
      _error.errors.forEach((err) => {
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

    // Handle owner removal error (403)
    if (_error instanceof OwnerRemovalError) {
      return new Response(
        JSON.stringify({
          error: _error.message,
        } as ErrorResponse),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle insufficient permissions error (403)
    if (_error instanceof InsufficientPermissionsError) {
      return new Response(
        JSON.stringify({
          error: _error.message,
        } as ErrorResponse),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle NotFoundError (404)
    if (_error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: _error.message,
        } as ErrorResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle unexpected errors
    console.error("DELETE /api/workspaces/:workspace_id/members/:user_id - Błąd:", {
      workspaceId: params.workspace_id,
      targetUserId: params.user_id,
      currentUserId: locals.supabase ? "authenticated" : "unknown",
      error: _error instanceof Error ? _error.message : "Nieznany błąd",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Nie udało się usunąć członka",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

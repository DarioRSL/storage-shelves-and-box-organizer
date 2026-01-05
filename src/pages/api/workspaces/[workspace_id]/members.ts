import type { APIRoute } from "astro";
import { z, ZodError } from "zod";
import {
  DuplicateMemberError,
  getWorkspaceMembers,
  InsufficientPermissionsError,
  inviteWorkspaceMember,
} from "@/lib/services/workspace.service";
import { NotFoundError } from "@/lib/services/location.service";
import type { ErrorResponse } from "@/types";
import { log } from "@/lib/services/logger";

export const prerender = false;

/**
 * Validates workspace_id URL parameter
 */
const paramsSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID workspace"),
});

/**
 * Validates POST request body for inviting workspace members
 */
const bodySchema = z.object({
  email: z.string().email("Nieprawidłowy format email"),
  role: z.enum(["owner", "admin", "member", "read_only"], {
    errorMap: () => ({ message: "Nieprawidłowa rola" }),
  }),
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
    log.error("Unexpected error in API endpoint", {
      endpoint: "GET /api/workspaces/:workspace_id/members",
      workspaceId: params.workspace_id,
      error: error instanceof Error ? error.message : String(error)
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

/**
 * POST /api/workspaces/:workspace_id/members
 * Invites a new member to a workspace.
 *
 * @returns 201 Created with workspace member data, or appropriate error response
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Validate path parameters
    const validatedParams = paramsSchema.parse(params);
    const { workspace_id } = validatedParams;

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
    const { email, role } = validatedBody;

    // 5. Call service layer to invite member
    const newMember = await inviteWorkspaceMember(supabase, workspace_id, user.id, email, role);

    // 6. Return 201 Created with member data
    return new Response(JSON.stringify(newMember), {
      status: 201,
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

    // Handle duplicate member error (409)
    if (error instanceof DuplicateMemberError) {
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
    log.error("Unexpected error in API endpoint", {
      endpoint: "POST /api/workspaces/:workspace_id/members",
      workspaceId: params.workspace_id,
      error: error instanceof Error ? error.message : String(error)
    });

    return new Response(
      JSON.stringify({
        error: "Nie udało się dodać członka do workspace",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

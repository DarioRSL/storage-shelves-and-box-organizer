import type { APIRoute } from "astro";
import { deleteWorkspace, updateWorkspace, WorkspaceNotFoundError, WorkspaceOwnershipError } from "@/lib/services/workspace.service";
import { DeleteWorkspaceParamsSchema, PatchWorkspaceParamsSchema, PatchWorkspaceSchema } from "@/lib/validators/workspace.validators";
import type { DeleteWorkspaceResponse, ErrorResponse, PatchWorkspaceResponse } from "@/types";

export const prerender = false;

/**
 * PATCH /api/workspaces/:workspace_id
 * Updates a workspace's properties (name, description).
 *
 * URL Parameters:
 * - workspace_id (required): UUID of the workspace to update
 *
 * Request Body (all fields optional, but at least one required):
 * - name: string (min length 1, max 255 characters, trimmed)
 * - description: string | null (reserved for future use)
 *
 * Returns 200 OK with updated workspace on success.
 * Returns appropriate error status for validation and authorization failures.
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // 3. Extract and validate workspace_id parameter
    const paramsParseResult = PatchWorkspaceParamsSchema.safeParse({
      workspace_id: params.workspace_id,
    });

    if (!paramsParseResult.success) {
      const firstError = paramsParseResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: firstError.message,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { workspace_id } = paramsParseResult.data;

    // 4. Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowy format JSON",
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const bodyParseResult = PatchWorkspaceSchema.safeParse(requestBody);

    if (!bodyParseResult.success) {
      const firstError = bodyParseResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: firstError.message,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Call service layer to update workspace
    try {
      const updatedWorkspace: PatchWorkspaceResponse = await updateWorkspace(
        supabase,
        workspace_id,
        user.id,
        bodyParseResult.data
      );

      // 6. Return success response (200 OK)
      return new Response(JSON.stringify(updatedWorkspace), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle WorkspaceOwnershipError (403)
      if (error instanceof WorkspaceOwnershipError) {
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

      // Handle WorkspaceNotFoundError (404)
      if (error instanceof WorkspaceNotFoundError) {
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

      // Handle generic service errors (500)
      console.error("Service error in PATCH /api/workspaces/:workspace_id:", error);
      return new Response(
        JSON.stringify({
          error: "Nie udało się zaktualizować workspace'u",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors (500)
    console.error("Unexpected error in PATCH /api/workspaces/:workspace_id:", error);
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

/**
 * DELETE /api/workspaces/:workspace_id
 * Permanently deletes a workspace and all associated data.
 *
 * IMPORTANT: This is an irreversible operation. All data associated with the workspace
 * (boxes, locations, QR codes, members) will be permanently deleted.
 *
 * URL Parameters:
 * - workspace_id (required): UUID of the workspace to delete
 *
 * Authorization:
 * - Requires JWT authentication
 * - Only workspace owner can delete the workspace
 *
 * Returns 200 OK with deletion confirmation on success.
 * Returns appropriate error status for validation and authorization failures.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "Brakujący lub nieprawidłowy token JWT",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Extract and validate workspace_id parameter
    const paramsParseResult = DeleteWorkspaceParamsSchema.safeParse({
      workspace_id: params.workspace_id,
    });

    if (!paramsParseResult.success) {
      const firstError = paramsParseResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          details: firstError.message,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { workspace_id } = paramsParseResult.data;

    // 4. Call service layer to delete workspace
    try {
      const result = await deleteWorkspace(supabase, workspace_id, user.id);

      // 5. Return success response (200 OK)
      return new Response(
        JSON.stringify({
          message: "Workspace deleted successfully",
          workspace_id: result.workspace_id,
        } as DeleteWorkspaceResponse),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      // Handle WorkspaceOwnershipError (403)
      if (error instanceof WorkspaceOwnershipError) {
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            details: error.message,
          } as ErrorResponse),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle WorkspaceNotFoundError (404)
      if (error instanceof WorkspaceNotFoundError) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            details: error.message,
          } as ErrorResponse),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle generic service errors (500)
      console.error("Service error in DELETE /api/workspaces/:workspace_id:", error);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          details: "Nie udało się usunąć przestrzeni roboczej",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors (500)
    console.error("Unexpected error in DELETE /api/workspaces/:workspace_id:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: "Wewnętrzny błąd serwera",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

import type { APIRoute } from "astro";
import { z } from "zod";
import { createWorkspace, getUserWorkspaces } from "@/lib/services/workspace.service";
import type { CreateWorkspaceRequest, WorkspaceDto, ErrorResponse } from "@/types";
import { log } from "@/lib/services/logger";

export const prerender = false;

// Validation schema
const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nazwa workspace'a nie może być pusta")
    .max(255, "Nazwa workspace'a nie może przekraczać 255 znaków"),
});

/**
 * POST /api/workspaces
 * Creates a new workspace with the authenticated user as owner.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication using context.locals.user (already authenticated by middleware)
    const user = locals.user;

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

    // 3. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowy format żądania",
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Validate input
    const parseResult = CreateWorkspaceSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane wejściowe",
          details: parseResult.error.flatten().fieldErrors,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedData: CreateWorkspaceRequest = parseResult.data;

    // 5. Call service layer
    const { data: workspace, error: serviceError } = await createWorkspace(supabase, user.id, validatedData);

    if (serviceError || !workspace) {
      log.error("Service layer error", {
        endpoint: "POST /api/workspaces",
        error: serviceError,
      });
      return new Response(
        JSON.stringify({
          error: "Wystąpił błąd podczas tworzenia workspace'a",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 6. Return success response
    return new Response(JSON.stringify(workspace as WorkspaceDto), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    log.error("Unexpected error in API endpoint", {
      endpoint: "POST /api/workspaces",
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({
        error: "Wystąpił nieoczekiwany błąd",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * GET /api/workspaces
 * Retrieves all workspaces that the authenticated user belongs to.
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication using context.locals.user (already authenticated by middleware)
    const user = locals.user;

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "Nie jesteś uwierzytelniony",
          details: "Użytkownik nie jest zalogowany",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Call service layer to get user workspaces
    const workspaces = await getUserWorkspaces(supabase, user.id);

    // 4. Return success response with workspaces array
    return new Response(JSON.stringify(workspaces), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    log.error("Unexpected error in API endpoint", {
      endpoint: "GET /api/workspaces",
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd wewnętrzny serwera",
        details: "Nie udało się pobrać workspace'ów",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

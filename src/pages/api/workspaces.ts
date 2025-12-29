import type { APIRoute } from "astro";
import { z } from "zod";
import { extractUserIdFromSession } from "@/lib/auth.utils";
import { createWorkspace, getUserWorkspaces } from "@/lib/services/workspace.service";
import type { CreateWorkspaceRequest, WorkspaceDto, ErrorResponse } from "@/types";

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
    // 1. Extract user ID from sb_session cookie
    const userId = extractUserIdFromSession(request);

    if (!userId) {
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

    // 2. Parse request body
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

    // 3. Validate input
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

    // 4. Get Supabase client from context
    const supabase = locals.supabase;

    // 5. Call service layer
    const { data: workspace, error: serviceError } = await createWorkspace(supabase, userId, validatedData);

    if (serviceError || !workspace) {
      console.error("Service error:", serviceError);
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
    console.error("Unexpected error in POST /api/workspaces:", error);
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
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Extract user ID from sb_session cookie
    const userId = extractUserIdFromSession(request);

    if (!userId) {
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

    // 2. Get Supabase client from context
    const supabase = locals.supabase;

    // 3. Call service layer to get user workspaces
    const workspaces = await getUserWorkspaces(supabase, userId);

    // 4. Return success response with workspaces array
    return new Response(JSON.stringify(workspaces), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/workspaces:", error);
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

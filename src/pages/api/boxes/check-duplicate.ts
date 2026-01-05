import type { APIRoute } from "astro";
import { checkDuplicateBoxName } from "@/lib/services/box.service";
import { CheckDuplicateBoxSchema } from "@/lib/validators/box.validators";
import type { CheckDuplicateBoxRequest, CheckDuplicateBoxResponse, ErrorResponse } from "@/types";
import { log } from "@/lib/services/logger";

export const prerender = false;

/**
 * POST /api/boxes/check-duplicate
 * Checks if a box with the given name already exists in the workspace.
 *
 * Used for non-blocking duplicate name warnings in box creation/editing forms.
 * This is a validation helper endpoint that does not modify any data.
 *
 * Required fields: workspace_id, name
 * Optional fields: exclude_box_id (for edit mode)
 *
 * Returns 200 OK with { isDuplicate, count } on success.
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
          error: "Nieautoryzowany dostęp",
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

    // 4. Validate input with Zod schema
    const parseResult = CheckDuplicateBoxSchema.safeParse(body);

    if (!parseResult.success) {
      // Extract first error message for user-friendly response
      const firstError = parseResult.error.errors[0];
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

    const validatedData: CheckDuplicateBoxRequest = parseResult.data;

    // 5. Call service layer to check for duplicates
    const result: CheckDuplicateBoxResponse = await checkDuplicateBoxName(
      supabase,
      validatedData.workspace_id,
      validatedData.name,
      validatedData.exclude_box_id
    );

    // 6. Return result (200 OK)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log unexpected errors
    log.error("[POST /api/boxes/check-duplicate] Unexpected error:", {
      error: error instanceof Error ? error.message : String(error)
    });

    // Return generic error (500 Internal Server Error)
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

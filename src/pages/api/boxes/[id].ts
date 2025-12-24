import type { APIRoute } from "astro";
import { getBoxById, BoxNotFoundError } from "@/lib/services/box.service";
import { GetBoxByIdSchema } from "@/lib/validators/box.validators";
import type { BoxDto, ErrorResponse } from "@/types";

export const prerender = false;

/**
 * GET /api/boxes/:id
 * Retrieves detailed information for a specific box.
 *
 * URL Parameters:
 * - id (required): UUID of the box
 *
 * Returns 200 OK with BoxDto on success.
 */
export const GET: APIRoute = async ({ params, locals }) => {
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
          error: "Nieautoryzowany dostęp",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Extract and validate box ID from URL params
    const parseResult = GetBoxByIdSchema.safeParse({ id: params.id });

    if (!parseResult.success) {
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

    const { id } = parseResult.data;

    // 4. Call service layer to fetch box
    try {
      const box: BoxDto = await getBoxById(supabase, id, user.id);

      // 5. Return success response (200 OK)
      return new Response(JSON.stringify(box), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle BoxNotFoundError (404)
      if (error instanceof BoxNotFoundError) {
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
      console.error("Service error in GET /api/boxes/:id:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Nie udało się pobrać pudełka",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors (500)
    console.error("Unexpected error in GET /api/boxes/:id:", error);
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

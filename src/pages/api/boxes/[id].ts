import type { APIRoute } from "astro";
import {
  getBoxById,
  deleteBox,
  updateBox,
  BoxNotFoundError,
  LocationNotFoundError,
  WorkspaceMismatchError,
} from "@/lib/services/box.service";
import {
  GetBoxByIdSchema,
  DeleteBoxSchema,
  UpdateBoxParamsSchema,
  UpdateBoxSchema,
} from "@/lib/validators/box.validators";
import type { BoxDto, ErrorResponse, SuccessResponse, UpdateBoxResponse } from "@/types";

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
 * DELETE /api/boxes/:id
 * Permanently deletes a box from the system.
 * Database trigger automatically resets the linked QR code.
 *
 * URL Parameters:
 * - id (required): UUID of the box to delete
 *
 * Returns 200 OK with success message on completion.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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

    // 3. Extract and validate box ID from URL params
    const parseResult = DeleteBoxSchema.safeParse({ id: params.id });

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

    // 4. Call service layer to delete box
    try {
      await deleteBox(supabase, id, user.id);

      // 5. Return success response (200 OK)
      return new Response(
        JSON.stringify({
          message: "Box deleted successfully.",
        } as SuccessResponse),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      // Handle BoxNotFoundError (404)
      if (error instanceof BoxNotFoundError) {
        return new Response(
          JSON.stringify({
            error: "Pudełko nie znalezione",
          } as ErrorResponse),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle generic service errors (500)
      return new Response(
        JSON.stringify({
          error: "Nie udało się usunąć pudełka",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors (500)
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
 * PATCH /api/boxes/:id
 * Updates an existing box's details (partial update).
 * Supports updating name, description, tags, and location_id.
 *
 * URL Parameters:
 * - id (required): UUID of the box to update
 *
 * Request Body (all fields optional, but at least one required):
 * - name: string (min length 1)
 * - description: string | null (max 10,000 characters)
 * - tags: string[] | null
 * - location_id: string (UUID) | null
 *
 * Returns 200 OK with UpdateBoxResponse on success.
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
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

    // 3. Extract and validate box ID from URL params
    const paramsParseResult = UpdateBoxParamsSchema.safeParse({ id: params.id });

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

    const { id } = paramsParseResult.data;

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

    const bodyParseResult = UpdateBoxSchema.safeParse(requestBody);

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

    // 5. Call service layer to update box
    try {
      const updatedBox: UpdateBoxResponse = await updateBox(supabase, id, user.id, bodyParseResult.data);

      // 6. Return success response (200 OK)
      return new Response(JSON.stringify(updatedBox), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle BoxNotFoundError (404)
      if (error instanceof BoxNotFoundError) {
        return new Response(
          JSON.stringify({
            error: "Pudełko nie zostało znalezione",
          } as ErrorResponse),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle LocationNotFoundError (404)
      if (error instanceof LocationNotFoundError) {
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

      // Handle WorkspaceMismatchError (403)
      if (error instanceof WorkspaceMismatchError) {
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

      // Handle generic service errors (500)
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Nie udało się zaktualizować pudełka",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors (500)
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

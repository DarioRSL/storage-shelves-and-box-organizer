import type { APIRoute } from "astro";
import {
  createBox,
  getBoxes,
  QrCodeAlreadyAssignedError,
  QrCodeNotFoundError,
  LocationNotFoundError,
  WorkspaceMismatchError,
} from "@/lib/services/box.service";
import { CreateBoxSchema, GetBoxesQuerySchema } from "@/lib/validators/box.validators";
import type { CreateBoxRequest, CreateBoxResponse, GetBoxesQuery, BoxDto, ErrorResponse } from "@/types";

export const prerender = false;

/**
 * POST /api/boxes
 * Creates a new box in the inventory system.
 *
 * Required fields: workspace_id, name
 * Optional fields: description, tags, location_id, qr_code_id
 *
 * Returns 201 Created with box data on success.
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
    const parseResult = CreateBoxSchema.safeParse(body);

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

    const validatedData: CreateBoxRequest = parseResult.data;

    // 5. Call service layer to create box
    try {
      const box: CreateBoxResponse = await createBox(supabase, validatedData);

      // 6. Return success response (201 Created)
      return new Response(JSON.stringify(box), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle custom errors from service layer with appropriate status codes
      if (error instanceof QrCodeAlreadyAssignedError) {
        return new Response(
          JSON.stringify({
            error: error.message,
          } as ErrorResponse),
          {
            status: 409, // Conflict
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (error instanceof QrCodeNotFoundError || error instanceof LocationNotFoundError) {
        return new Response(
          JSON.stringify({
            error: error.message,
          } as ErrorResponse),
          {
            status: 404, // Not Found
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (error instanceof WorkspaceMismatchError) {
        return new Response(
          JSON.stringify({
            error: error.message,
          } as ErrorResponse),
          {
            status: 403, // Forbidden
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle RLS policy violation (user not workspace member)
      if (error instanceof Error && error.message.includes("Brak dostępu")) {
        return new Response(
          JSON.stringify({
            error: error.message,
          } as ErrorResponse),
          {
            status: 403, // Forbidden
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle generic errors from service layer
      console.error("Service error in POST /api/boxes:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Nie udało się utworzyć pudełka",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("Unexpected error in POST /api/boxes:", error);
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
 * GET /api/boxes
 * Retrieves a filtered, searchable, paginated list of boxes.
 *
 * Query parameters:
 * - workspace_id (required): UUID of the workspace
 * - q (optional): Search query for full-text search
 * - location_id (optional): Filter by location UUID
 * - is_assigned (optional): Filter by assignment status
 * - limit (optional): Max results (default 50, max 100)
 * - offset (optional): Pagination offset (default 0)
 *
 * Returns 200 OK with array of boxes on success.
 */
export const GET: APIRoute = async ({ request, locals }) => {
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

    // 3. Parse query parameters from URL
    const url = new URL(request.url);
    const queryParams = {
      workspace_id: url.searchParams.get("workspace_id"),
      q: url.searchParams.get("q"),
      location_id: url.searchParams.get("location_id"),
      is_assigned: url.searchParams.get("is_assigned"),
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
    };

    // 4. Validate query parameters with Zod schema
    const parseResult = GetBoxesQuerySchema.safeParse(queryParams);

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

    const validatedQuery: GetBoxesQuery = parseResult.data;

    // 5. Call service layer to fetch boxes
    try {
      const boxes: BoxDto[] = await getBoxes(supabase, validatedQuery);

      // 6. Return success response (200 OK)
      return new Response(JSON.stringify(boxes), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle errors from service layer
      console.error("Service error in GET /api/boxes:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Nie udało się pobrać pudełek",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("Unexpected error in GET /api/boxes:", error);
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

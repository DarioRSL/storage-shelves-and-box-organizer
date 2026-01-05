import type { APIRoute } from "astro";
import { ZodError } from "zod";
import {
  createLocation,
  getLocations,
  WorkspaceMembershipError,
  ParentNotFoundError,
  MaxDepthExceededError,
  SiblingConflictError,
} from "@/lib/services/location.service";
import { CreateLocationSchema, GetLocationsQuerySchema } from "@/lib/validators/location.validators";
import type { ErrorResponse } from "@/types";
import { log } from "@/lib/services/logger";

export const prerender = false;

/**
 * POST /api/locations
 * Creates a new location in the hierarchical storage structure.
 *
 * @returns 201 Created with location data on success, or appropriate error response
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
    const body = await request.json();

    // 4. Validate request body with Zod schema
    const validatedData = CreateLocationSchema.parse(body);

    // 5. Call service layer to create location
    const location = await createLocation(supabase, user.id, validatedData);

    // 6. Return 201 Created with location data
    return new Response(JSON.stringify(location), {
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
          error: "Walidacja nie powiodła się",
          details: formattedErrors,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle custom service errors
    if (error instanceof WorkspaceMembershipError) {
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

    if (error instanceof ParentNotFoundError) {
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

    if (error instanceof MaxDepthExceededError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error instanceof SiblingConflictError) {
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

    // Handle generic errors
    log.error("Unexpected error in API endpoint", {
      endpoint: "POST /api/locations",
      error: error instanceof Error ? error.message : String(error)
    });

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
 * GET /api/locations
 * Retrieves all storage locations within a specified workspace with optional hierarchical filtering.
 *
 * Query Parameters:
 * - workspace_id (required): UUID of the workspace to query locations from
 * - parent_id (optional): UUID of parent location to filter children (omit for root locations)
 *
 * @returns 200 OK with array of locations, or appropriate error response
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

    // 3. Parse and validate query parameters
    const url = new URL(request.url);
    const rawParams = {
      workspace_id: url.searchParams.get("workspace_id"),
      parent_id: url.searchParams.get("parent_id") || null,
    };

    const validatedParams = GetLocationsQuerySchema.parse(rawParams);

    // 4. Call service layer to retrieve locations
    const locations = await getLocations(supabase, user.id, validatedParams.workspace_id, validatedParams.parent_id);

    // 5. Return 200 OK with locations array
    return new Response(JSON.stringify(locations), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60",
      },
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
          error: "Walidacja nie powiodła się",
          details: formattedErrors,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle custom service errors
    if (error instanceof WorkspaceMembershipError) {
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

    if (error instanceof ParentNotFoundError) {
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

    // Handle generic errors
    log.error("Unexpected error in API endpoint", {
      endpoint: "GET /api/locations",
      error: error instanceof Error ? error.message : String(error)
    });

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

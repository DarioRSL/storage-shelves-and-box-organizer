import type { APIRoute } from "astro";
import { z, ZodError } from "zod";
import {
  updateLocation,
  deleteLocation,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "@/lib/services/location.service";
import type { ErrorResponse, SuccessResponse } from "@/types";

export const prerender = false;

/**
 * Zod schema for validating UUID path parameter
 */
const paramsSchema = z.object({
  id: z.string().uuid("Invalid location ID format"),
});

/**
 * Zod schema for validating PATCH request body
 */
const updateLocationSchema = z
  .object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    description: z.string().nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "At least one field (name or description) must be provided",
  });

/**
 * PATCH /api/locations/:id
 * Updates an existing location's name and/or description.
 * When the name is updated, the ltree path is regenerated to maintain hierarchy integrity.
 *
 * @returns 200 OK with updated location data on success, or appropriate error response
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Extract and validate path parameters
    const paramValidation = paramsSchema.safeParse({ id: params.id });

    if (!paramValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid location ID format",
          details: paramValidation.error.format(),
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 2. Get Supabase client from context
    const supabase = locals.supabase;

    // 3. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validation = updateLocationSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation error",
          details: validation.error.format(),
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Call service layer
    const result = await updateLocation(supabase, paramValidation.data.id, user.id, validation.data);

    // 6. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific error types
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

    if (error instanceof ConflictError) {
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

    if (error instanceof ForbiddenError) {
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

    // Handle Zod validation errors (should be caught earlier, but safety fallback)
    if (error instanceof ZodError) {
      const formattedErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        formattedErrors[path] = err.message;
      });

      return new Response(
        JSON.stringify({
          error: "Validation error",
          details: formattedErrors,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Log unexpected errors
    console.error("Error updating location:", error);

    // Return generic error to client
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * DELETE /api/locations/:id
 * Soft deletes a location and unassigns all boxes from it.
 * The location is marked as deleted (is_deleted = true) rather than being physically removed.
 *
 * @returns 200 OK with success message, or appropriate error response
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // 1. Extract and validate path parameters
    const paramValidation = paramsSchema.safeParse({ id: params.id });

    if (!paramValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowy format ID lokalizacji",
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 2. Get Supabase client from context
    const supabase = locals.supabase;

    // 3. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // 4. Call service layer to perform soft delete
    await deleteLocation(supabase, paramValidation.data.id, user.id);

    // 5. Return success response
    return new Response(
      JSON.stringify({
        message: "Lokalizacja została usunięta, a powiązane pudełka odłączone",
      } as SuccessResponse),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Handle specific error types
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

    // Handle Zod validation errors (safety fallback)
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

    // Log unexpected errors
    console.error("DELETE /api/locations/:id - Błąd serwera:", {
      locationId: params.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Return generic error to client
    return new Response(
      JSON.stringify({
        error: "Nie udało się usunąć lokalizacji",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

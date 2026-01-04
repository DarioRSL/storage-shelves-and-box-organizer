import type { APIRoute } from "astro";
import { z } from "zod";
import type { UpdateThemeRequest, UpdateThemeResponse, ErrorResponse } from "@/types";

export const prerender = false;

/**
 * PATCH /api/profiles/me/theme
 * Updates the theme preference for the currently authenticated user.
 *
 * Authentication is required via JWT token in session cookie.
 * The middleware validates the token and attaches user session to context.locals.
 *
 * @param {UpdateThemeRequest} body - Theme preference ('light', 'dark', or 'system')
 * @returns 200 - Updated theme preference (UpdateThemeResponse)
 * @returns 400 - Invalid request body
 * @returns 401 - User not authenticated
 * @returns 500 - Internal server error
 */
export const PATCH: APIRoute = async ({ locals, request }) => {
  try {
    // 1. Get Supabase client from context (injected by middleware)
    const supabase = locals.supabase;

    // 2. Verify authentication using context.locals.user (already authenticated by middleware)
    const user = locals.user;

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "Nie jesteś uwierzytelniony",
          details: "Wymagana autoryzacja",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Parse and validate request body
    const themeSchema = z.object({
      theme_preference: z.enum(["light", "dark", "system"], {
        errorMap: () => ({ message: "Theme must be 'light', 'dark', or 'system'" }),
      }),
    });

    let body: UpdateThemeRequest;
    try {
      const rawBody = await request.json();
      body = themeSchema.parse(rawBody);
    } catch (validationError) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane wejściowe",
          details: validationError instanceof z.ZodError ? validationError.errors : "Nieprawidłowy format danych",
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Update theme preference in database
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ theme_preference: body.theme_preference })
      .eq("id", user.id)
      .select("theme_preference")
      .single();

    if (updateError) {
      console.error("Error updating theme preference:", updateError);
      return new Response(
        JSON.stringify({
          error: "Błąd aktualizacji motywu",
          details: updateError.message,
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Return success response with updated theme
    return new Response(
      JSON.stringify({
        theme_preference: updatedProfile.theme_preference,
      } as UpdateThemeResponse),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in PATCH /api/profiles/me/theme:", error);

    // Generic server error
    return new Response(
      JSON.stringify({
        error: "Błąd wewnętrzny serwera",
        details: "Nie udało się zaktualizować motywu",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

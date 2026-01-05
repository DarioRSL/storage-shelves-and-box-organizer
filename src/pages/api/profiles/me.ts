import type { APIRoute } from "astro";
import { getAuthenticatedUserProfile } from "@/lib/services/profile.service";
import type { ProfileDto, ErrorResponse } from "@/types";
import { log } from "@/lib/services/logger";

export const prerender = false;

/**
 * GET /api/profiles/me
 * Retrieves the profile information of the currently authenticated user.
 *
 * Authentication is required via JWT token in session cookie.
 * The middleware validates the token and attaches user session to context.locals.
 *
 * @returns 200 - Profile data (ProfileDto)
 * @returns 401 - User not authenticated
 * @returns 404 - Profile not found (edge case)
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async ({ locals }) => {
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

    // 3. Call service layer to retrieve user profile
    const profile = await getAuthenticatedUserProfile(supabase, user.id);

    // 4. Return success response with profile data
    return new Response(JSON.stringify(profile as ProfileDto), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    log.error("Error in GET /api/profiles/me:", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Handle specific error cases
    if (error instanceof Error && error.message === "User profile not found") {
      return new Response(
        JSON.stringify({
          error: "Nie znaleziono",
          details: "Nie znaleziono profilu użytkownika",
        } as ErrorResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generic server error
    return new Response(
      JSON.stringify({
        error: "Błąd wewnętrzny serwera",
        details: "Nie udało się pobrać profilu",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

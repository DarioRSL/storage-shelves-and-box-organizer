import type { APIRoute } from "astro";
import { extractUserIdFromSession } from "@/lib/auth.utils";
import { getAuthenticatedUserProfile } from "@/lib/services/profile.service";
import type { ProfileDto, ErrorResponse } from "@/types";

export const prerender = false;

/**
 * GET /api/profiles/me
 * Retrieves the profile information of the currently authenticated user.
 *
 * Authentication is required via JWT token in Authorization header.
 * The middleware validates the token and attaches user session to context.locals.
 *
 * @returns 200 - Profile data (ProfileDto)
 * @returns 401 - User not authenticated
 * @returns 404 - Profile not found (edge case)
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Extract user ID from sb_session cookie
    const userId = extractUserIdFromSession(request);

    if (!userId) {
      console.error("[GET /api/profiles/me] Failed to extract user from session");
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

    console.log("[GET /api/profiles/me] Authenticated user:", userId);

    // 2. Get Supabase client from context
    const supabase = locals.supabase;

    // 3. Call service layer to retrieve user profile
    const profile = await getAuthenticatedUserProfile(supabase, userId);

    // 4. Return success response with profile data
    return new Response(JSON.stringify(profile as ProfileDto), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET /api/profiles/me:", error);

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

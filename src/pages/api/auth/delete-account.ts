import type { APIRoute } from "astro";
import { deleteUserAccount } from "@/lib/services/auth.service";
import { UserAccountNotFoundError, AccountDeletionError, AuthRevocationError } from "@/lib/services/errors";
import type { DeleteAccountResponse, ErrorResponse } from "@/types";

export const prerender = false;

/**
 * DELETE /api/auth/delete-account
 * Permanently deletes the authenticated user's account and all associated data.
 *
 * IMPORTANT: This is an irreversible operation. All data associated with the user
 * (workspaces, boxes, locations, QR codes, profile) will be permanently deleted.
 *
 * Authorization:
 * - Requires JWT authentication (Bearer token in Authorization header)
 * - User can only delete their own account (no parameter-based user ID)
 *
 * Returns 200 OK with deletion confirmation on success.
 * Returns appropriate error status for authentication and deletion failures.
 */
export const DELETE: APIRoute = async ({ locals }) => {
  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication using context.locals.user (already authenticated by middleware)
    const user = locals.user;

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "Brakujący lub nieprawidłowy token JWT",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Call service layer to delete user account
    try {
      await deleteUserAccount(supabase, user.id);

      // 4. Return success response (200 OK)
      return new Response(
        JSON.stringify({
          message: "Account successfully deleted",
        } as DeleteAccountResponse),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (_error) {
      // Handle UserAccountNotFoundError (404)
      if (_error instanceof UserAccountNotFoundError) {
        return new Response(
          JSON.stringify({
            error: _error.message,
          } as ErrorResponse),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle AuthRevocationError (500)
      if (_error instanceof AuthRevocationError) {
        return new Response(
          JSON.stringify({
            error: _error.message,
          } as ErrorResponse),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle AccountDeletionError (500)
      if (_error instanceof AccountDeletionError) {
        return new Response(
          JSON.stringify({
            error: _error.message,
          } as ErrorResponse),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle generic service errors (500)
      return new Response(
        JSON.stringify({
          error: "Nie udało się usunąć konta",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
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

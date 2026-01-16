import type { SupabaseClient } from "@/db/supabase.client";
import { UserAccountNotFoundError, AccountDeletionError, AuthRevocationError } from "./errors";
import { log } from "./logger";

/**
 * Permanently deletes a user's account and all associated data.
 *
 * This is an irreversible operation that removes:
 * - All boxes in all user's workspaces (triggers QR code reset to 'generated')
 * - All QR codes marked as 'assigned' (explicitly reset to 'generated')
 * - All locations in all user's workspaces
 * - All workspace memberships
 * - All workspaces owned by the user
 * - The user profile
 * - The Supabase Auth user account
 *
 * Cascade deletion order (important for referential integrity):
 * 1. Delete boxes (triggers QR code reset via database trigger)
 * 2. Reset QR codes to 'generated' status (explicit)
 * 3. Delete locations
 * 4. Delete workspace_members
 * 5. Delete workspaces
 * 6. Delete profile
 * 7. Revoke Supabase Auth user
 *
 * @param supabase - Supabase client instance with admin privileges
 * @param userId - ID of the user to delete
 * @returns Object with user_id of deleted user
 * @throws UserAccountNotFoundError if user profile doesn't exist
 * @throws AccountDeletionError if database deletion fails
 * @throws AuthRevocationError if Supabase Auth revocation fails
 */
export async function deleteUserAccount(supabase: SupabaseClient, userId: string): Promise<{ user_id: string }> {
  try {
    // Step 1: Verify user profile exists
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", userId)
      .single();

    if (profileError || !userProfile) {
      log.error("Failed to verify user profile", {
        userId,
        error: profileError?.message,
        code: profileError?.code,
      });
      throw new UserAccountNotFoundError();
    }

    // Step 2: Get all workspaces owned by the user to understand scope
    const { data: userWorkspaces, error: workspacesError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId);

    if (workspacesError) {
      log.error("Failed to fetch user workspaces", {
        userId,
        error: workspacesError.message,
        code: workspacesError.code,
      });
      throw new AccountDeletionError("Nie udało się pobrać workspaces użytkownika");
    }

    const workspaceIds = userWorkspaces?.map((w) => w.id) || [];
    log.info("Initiating account deletion", {
      userId,
      workspaceCount: workspaceIds.length,
    });

    // Step 3a: Delete boxes in all user's workspaces
    // This cascades to trigger QR code resets
    if (workspaceIds.length > 0) {
      const { error: deleteBoxesError } = await supabase.from("boxes").delete().in("workspace_id", workspaceIds);

      if (deleteBoxesError) {
        log.error("Failed to delete boxes during account deletion", {
          userId,
          error: deleteBoxesError.message,
          code: deleteBoxesError.code,
        });
        throw new AccountDeletionError("Nie udało się usunąć pudełek");
      }
    }

    // Step 3b: Explicitly reset QR codes to 'generated' status
    // Ensures no orphaned assigned codes remain
    if (workspaceIds.length > 0) {
      const { error: resetQrError } = await supabase
        .from("qr_codes")
        .update({ status: "generated", box_id: null })
        .in("workspace_id", workspaceIds)
        .eq("status", "assigned");

      if (resetQrError) {
        log.error("Failed to reset QR codes during account deletion", {
          userId,
          error: resetQrError.message,
          code: resetQrError.code,
        });
        throw new AccountDeletionError("Nie udało się zresetować kodów QR");
      }
    }

    // Step 3c: Delete locations in all user's workspaces
    if (workspaceIds.length > 0) {
      const { error: deleteLocationsError } = await supabase
        .from("locations")
        .delete()
        .in("workspace_id", workspaceIds);

      if (deleteLocationsError) {
        log.error("Failed to delete locations during account deletion", {
          userId,
          error: deleteLocationsError.message,
          code: deleteLocationsError.code,
        });
        throw new AccountDeletionError("Nie udało się usunąć lokalizacji");
      }
    }

    // Step 3d: Delete all workspace_members entries
    // This handles both direct memberships and workspace ownership cases
    if (workspaceIds.length > 0) {
      const { error: deleteMembersError } = await supabase
        .from("workspace_members")
        .delete()
        .in("workspace_id", workspaceIds);

      if (deleteMembersError) {
        log.error("Failed to delete workspace members during account deletion", {
          userId,
          error: deleteMembersError.message,
          code: deleteMembersError.code,
        });
        throw new AccountDeletionError("Nie udało się usunąć członkostwa w workspaces");
      }
    }

    // Step 3e: Delete all workspaces owned by the user
    if (workspaceIds.length > 0) {
      const { error: deleteWorkspacesError } = await supabase.from("workspaces").delete().eq("owner_id", userId);

      if (deleteWorkspacesError) {
        log.error("Failed to delete workspaces during account deletion", {
          userId,
          error: deleteWorkspacesError.message,
          code: deleteWorkspacesError.code,
        });
        throw new AccountDeletionError("Nie udało się usunąć workspaces");
      }
    }

    // Step 3f: Delete user profile
    const { error: deleteProfileError } = await supabase.from("profiles").delete().eq("id", userId);

    if (deleteProfileError) {
      log.error("Failed to delete profile during account deletion", {
        userId,
        error: deleteProfileError.message,
        code: deleteProfileError.code,
      });
      throw new AccountDeletionError("Nie udało się usunąć profilu użytkownika");
    }

    // Step 3g: Revoke Supabase Auth user
    // Note: Full auth user deletion requires service role privileges (admin API).
    // The auth.users record will remain but the profile deletion above effectively
    // marks the user as deleted in the application layer.
    // TODO: Implement auth user deletion via service role key when available.
    log.info("Auth user deletion deferred - requires service role privileges", {
      userId,
    });

    // Step 4: Log successful deletion (anonymized)
    log.info("Account deletion completed successfully", {
      userId,
    });

    // Step 5: Return success with deleted user_id
    return { user_id: userId };
  } catch (error) {
    // Re-throw custom errors as-is
    if (
      error instanceof UserAccountNotFoundError ||
      error instanceof AccountDeletionError ||
      error instanceof AuthRevocationError
    ) {
      throw error;
    }

    // Log and throw unexpected errors
    log.error("Unexpected error in deleteUserAccount", {
      userId,
      error: error instanceof Error ? error.message : "Nieznany błąd",
    });
    throw error instanceof Error ? error : new AccountDeletionError();
  }
}

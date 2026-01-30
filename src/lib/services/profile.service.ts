import type { SupabaseClient } from "@/db/supabase.client";
import type { ProfileDto } from "@/types";
import { log } from "./logger";

/**
 * Retrieves the profile of the currently authenticated user.
 *
 * Uses a SECURITY DEFINER function to bypass RLS policies, which is necessary
 * when using custom session cookie authentication where auth.uid() is not available.
 *
 * @param supabase - Supabase client instance with user context
 * @param userId - ID of the authenticated user
 * @returns User's profile data
 * @throws Error if the profile is not found or the database query fails
 */
export async function getAuthenticatedUserProfile(supabase: SupabaseClient, userId: string): Promise<ProfileDto> {
  try {
    // Use SECURITY DEFINER function to bypass RLS
    // This is necessary because our custom session cookie auth doesn't set auth.uid()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("get_user_profile", {
      p_user_id: userId,
    });

    if (error) {
      log.error("Failed to fetch user profile", {
        userId,
        error: error.message,
        code: error.code,
      });
      throw new Error("Failed to retrieve profile");
    }

    // Data from RPC is an array, get the first row
    const rows = data as {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      created_at: string;
      updated_at: string;
      theme_preference: string | null;
    }[];

    if (!rows || rows.length === 0) {
      log.warn("Profile not found for user", { userId });
      throw new Error("User profile not found");
    }

    const profile = rows[0];
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      theme_preference: profile.theme_preference,
    };
  } catch (error) {
    log.error("Unexpected error in getAuthenticatedUserProfile", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof Error ? error : new Error("Failed to retrieve profile");
  }
}

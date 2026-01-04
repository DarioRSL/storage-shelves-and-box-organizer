import type { SupabaseClient } from "@/db/supabase.client";
import type { ProfileDto } from "@/types";

/**
 * Retrieves the profile of the currently authenticated user.
 *
 * This function queries the profiles table for the authenticated user's profile data.
 * Row Level Security (RLS) policies automatically ensure users can only access
 * their own profile.
 *
 * @param supabase - Supabase client instance with user context
 * @param userId - ID of the authenticated user
 * @returns User's profile data
 * @throws Error if the profile is not found or the database query fails
 */
export async function getAuthenticatedUserProfile(supabase: SupabaseClient, userId: string): Promise<ProfileDto> {
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

    if (error) {
      console.error("Error fetching user profile:", error);
      throw new Error("Failed to retrieve profile");
    }

    if (!data) {
      console.warn(`Profile not found for user: ${userId}`);
      throw new Error("User profile not found");
    }

    return data;
  } catch (error) {
    console.error("Unexpected error in getAuthenticatedUserProfile:", error);
    throw error instanceof Error ? error : new Error("Failed to retrieve profile");
  }
}

import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateWorkspaceRequest, WorkspaceDto, WorkspaceMemberWithProfileDto } from "@/types";
import { NotFoundError } from "./location.service";

/**
 * Creates a new workspace and adds the creating user as owner.
 *
 * Note: The database trigger `add_owner_to_workspace_members()` automatically
 * adds the user to workspace_members with role 'owner' after workspace creation.
 * This ensures atomicity and data integrity.
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the user creating the workspace
 * @param data - Workspace creation data
 * @returns Created workspace or error
 */
export async function createWorkspace(
  supabase: SupabaseClient,
  userId: string,
  data: CreateWorkspaceRequest
): Promise<{ data: WorkspaceDto | null; error: Error | null }> {
  try {
    // Insert workspace
    // The database trigger will automatically add the user to workspace_members
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        owner_id: userId,
        name: data.name,
      })
      .select()
      .single();

    if (workspaceError) {
      console.error("Error creating workspace:", workspaceError);
      return {
        data: null,
        error: new Error("Failed to create workspace"),
      };
    }

    if (!workspace) {
      return {
        data: null,
        error: new Error("Workspace creation returned no data"),
      };
    }

    return { data: workspace, error: null };
  } catch (error) {
    console.error("Unexpected error in createWorkspace:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

/**
 * Retrieves all workspaces that the authenticated user is a member of.
 *
 * Uses a join with workspace_members to filter workspaces where the user
 * has membership. Row Level Security (RLS) policies automatically ensure
 * users only see workspaces they belong to.
 *
 * @param supabase - Supabase client instance with user context
 * @param userId - ID of the authenticated user
 * @returns Array of workspaces the user belongs to
 * @throws Error if the database query fails
 */
export async function getUserWorkspaces(supabase: SupabaseClient, userId: string): Promise<WorkspaceDto[]> {
  try {
    // Query workspaces joined with workspace_members
    // Using the more explicit approach with select
    const { data, error } = await supabase
      .from("workspace_members")
      .select(
        `
        workspace:workspaces(*)
      `
      )
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user workspaces:", error);
      throw new Error("Failed to retrieve workspaces");
    }

    // Transform the nested structure to flat WorkspaceDto array
    // Filter out any null workspace references and sort by created_at DESC
    const workspaces = (data || [])
      .map((item) => item.workspace)
      .filter((workspace): workspace is WorkspaceDto => workspace !== null)
      .sort((a, b) => {
        // Sort by created_at descending (newest first)
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

    return workspaces;
  } catch (error) {
    console.error("Unexpected error in getUserWorkspaces:", error);
    throw error instanceof Error ? error : new Error("Failed to retrieve workspaces");
  }
}

/**
 * Retrieves all members of a workspace with their profile information.
 *
 * RLS policies automatically enforce that only workspace members can
 * view the member list. If user is not a member, query returns empty.
 *
 * @param supabase - Supabase client instance with user context
 * @param workspaceId - UUID of the workspace
 * @returns Array of workspace members with profiles, sorted by joined_at ascending
 * @throws NotFoundError if workspace doesn't exist or user lacks access
 * @throws Error for database errors
 */
export async function getWorkspaceMembers(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceMemberWithProfileDto[]> {
  try {
    // Query workspace_members with JOIN to profiles
    // RLS policies ensure only workspace members can access this data
    const { data, error } = await supabase
      .from("workspace_members")
      .select(
        `
        user_id,
        workspace_id,
        role,
        joined_at,
        profile:profiles!user_id (
          email,
          full_name,
          avatar_url
        )
      `
      )
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching workspace members:", error);
      throw new Error("Nie udało się pobrać członków workspace");
    }

    // If empty result, either workspace doesn't exist or user is not a member
    // RLS blocks access to workspaces user doesn't belong to
    if (!data || data.length === 0) {
      throw new NotFoundError("Workspace nie został znaleziony");
    }

    // Transform to WorkspaceMemberWithProfileDto[]
    // Filter out any null profiles (should not happen with proper foreign keys)
    const members = data
      .filter(
        (member): member is typeof member & { profile: NonNullable<typeof member.profile> } => member.profile !== null
      )
      .map((member) => ({
        user_id: member.user_id,
        workspace_id: member.workspace_id,
        role: member.role,
        joined_at: member.joined_at,
        profile: {
          email: member.profile.email,
          full_name: member.profile.full_name,
          avatar_url: member.profile.avatar_url,
        },
      }));

    return members;
  } catch (error) {
    // Re-throw NotFoundError as-is
    if (error instanceof NotFoundError) {
      throw error;
    }

    console.error("Unexpected error in getWorkspaceMembers:", error);
    throw error instanceof Error ? error : new Error("Nie udało się pobrać członków workspace");
  }
}

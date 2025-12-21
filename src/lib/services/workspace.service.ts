import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateWorkspaceRequest, UserRole, WorkspaceDto, WorkspaceMemberWithProfileDto } from "@/types";
import { NotFoundError } from "./location.service";

/**
 * Custom error for insufficient permissions when inviting members.
 */
export class InsufficientPermissionsError extends Error {
  constructor(message = "Brak uprawnień do zaproszenia członka") {
    super(message);
    this.name = "InsufficientPermissionsError";
  }
}

/**
 * Custom error for duplicate workspace membership.
 */
export class DuplicateMemberError extends Error {
  constructor(message = "Użytkownik jest już członkiem tego workspace'u") {
    super(message);
    this.name = "DuplicateMemberError";
  }
}

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

/**
 * Invites a new member to a workspace by email.
 *
 * Validates that the current user has owner or admin role, checks that the user
 * with the provided email exists, and creates a workspace membership record.
 *
 * @param supabase - Supabase client instance with user context
 * @param workspaceId - UUID of the workspace
 * @param currentUserId - UUID of the user making the invitation
 * @param email - Email address of the user to invite
 * @param role - Role to assign to the new member
 * @returns Created workspace member with profile information
 * @throws InsufficientPermissionsError if current user is not owner/admin
 * @throws NotFoundError if user with email doesn't exist
 * @throws DuplicateMemberError if user is already a member
 * @throws Error for database errors
 */
export async function inviteWorkspaceMember(
  supabase: SupabaseClient,
  workspaceId: string,
  currentUserId: string,
  email: string,
  role: UserRole
): Promise<WorkspaceMemberWithProfileDto> {
  try {
    // 1. Check current user's role in workspace (must be owner or admin)
    const { data: currentMember, error: roleError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", currentUserId)
      .limit(1)
      .single();

    if (roleError || !currentMember) {
      console.error("Error checking user permissions:", roleError);
      throw new InsufficientPermissionsError();
    }

    if (currentMember.role !== "owner" && currentMember.role !== "admin") {
      throw new InsufficientPermissionsError();
    }

    // 2. Find user by email
    const { data: userProfile, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .limit(1)
      .single();

    if (userError || !userProfile) {
      console.error("User not found by email:", email, userError);
      throw new NotFoundError("Użytkownik nie został znaleziony");
    }

    const invitedUserId = userProfile.id;

    // 3. Check if user is already a member (duplicate check)
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", invitedUserId)
      .limit(1)
      .single();

    if (existingMember) {
      throw new DuplicateMemberError();
    }

    // 4. Insert new workspace member
    const { data: newMember, error: insertError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: invitedUserId,
        role: role,
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a unique constraint violation
      if (insertError.code === "23505") {
        throw new DuplicateMemberError();
      }
      console.error("Error inserting workspace member:", insertError);
      throw new Error("Nie udało się dodać członka do workspace");
    }

    if (!newMember) {
      throw new Error("Nie udało się dodać członka do workspace");
    }

    // 5. Fetch created member with profile data
    const { data: memberWithProfile, error: fetchError } = await supabase
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
      .eq("user_id", invitedUserId)
      .single();

    if (fetchError || !memberWithProfile || !memberWithProfile.profile) {
      console.error("Error fetching created member with profile:", fetchError);
      throw new Error("Nie udało się pobrać danych nowo dodanego członka");
    }

    // 6. Log success
    console.info("POST /api/workspaces/:workspace_id/members - Sukces:", {
      workspaceId: workspaceId,
      invitedUserId: invitedUserId,
      role: role,
      invitedByUserId: currentUserId,
      timestamp: new Date().toISOString(),
    });

    // 7. Return WorkspaceMemberWithProfileDto
    return {
      user_id: memberWithProfile.user_id,
      workspace_id: memberWithProfile.workspace_id,
      role: memberWithProfile.role,
      joined_at: memberWithProfile.joined_at,
      profile: {
        email: memberWithProfile.profile.email,
        full_name: memberWithProfile.profile.full_name,
        avatar_url: memberWithProfile.profile.avatar_url,
      },
    };
  } catch (error) {
    // Re-throw custom errors as-is
    if (
      error instanceof InsufficientPermissionsError ||
      error instanceof NotFoundError ||
      error instanceof DuplicateMemberError
    ) {
      throw error;
    }

    // Log and throw unexpected errors
    console.error("Unexpected error in inviteWorkspaceMember:", {
      workspaceId: workspaceId,
      inviteeEmail: email,
      currentUserId: currentUserId,
      error: error instanceof Error ? error.message : "Nieznany błąd",
      timestamp: new Date().toISOString(),
    });
    throw error instanceof Error ? error : new Error("Nie udało się dodać członka do workspace");
  }
}

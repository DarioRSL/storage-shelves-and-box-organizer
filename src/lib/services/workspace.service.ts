import type { SupabaseClient } from "@/db/supabase.client";
import type {
  CreateWorkspaceRequest,
  PatchWorkspaceRequest,
  PatchWorkspaceResponse,
  UserRole,
  WorkspaceDto,
  WorkspaceMemberDto,
  WorkspaceMemberWithProfileDto,
} from "@/types";
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
 * Custom error for invalid operations (e.g., removing last owner).
 */
export class InvalidOperationError extends Error {
  constructor(message = "Nieprawidłowa operacja") {
    super(message);
    this.name = "InvalidOperationError";
  }
}

/**
 * Custom error for attempting to remove workspace owner.
 */
export class OwnerRemovalError extends Error {
  constructor(message = "Nie można usunąć właściciela workspace'u") {
    super(message);
    this.name = "OwnerRemovalError";
  }
}

/**
 * Custom error for workspace not found.
 */
export class WorkspaceNotFoundError extends Error {
  constructor(message = "Workspace nie został znaleziony") {
    super(message);
    this.name = "WorkspaceNotFoundError";
  }
}

/**
 * Custom error for workspace ownership validation.
 */
export class WorkspaceOwnershipError extends Error {
  constructor(message = "Tylko właściciel workspace'u może go aktualizować") {
    super(message);
    this.name = "WorkspaceOwnershipError";
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

/**
 * Updates a workspace member's role.
 *
 * Validates permissions, checks business rules (e.g., last owner protection),
 * and updates the member's role in the database.
 *
 * @param supabase - Supabase client instance with user context
 * @param workspaceId - UUID of the workspace
 * @param targetUserId - UUID of the member whose role will be updated
 * @param currentUserId - UUID of the user making the change
 * @param newRole - New role to assign
 * @returns Updated workspace member record
 * @throws InsufficientPermissionsError if current user is not owner/admin
 * @throws NotFoundError if target member not found in workspace
 * @throws InvalidOperationError if attempting to change last owner's role
 * @throws Error for database errors
 */
export async function updateWorkspaceMemberRole(
  supabase: SupabaseClient,
  workspaceId: string,
  targetUserId: string,
  currentUserId: string,
  newRole: UserRole
): Promise<WorkspaceMemberDto> {
  try {
    // 1. Check current user's permissions (must be owner or admin)
    const { data: currentMember, error: roleError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", currentUserId)
      .limit(1)
      .single();

    if (roleError || !currentMember) {
      console.error("Error checking user permissions:", roleError);
      throw new InsufficientPermissionsError("Brak uprawnień do zmiany roli członka");
    }

    if (currentMember.role !== "owner" && currentMember.role !== "admin") {
      throw new InsufficientPermissionsError("Brak uprawnień do zmiany roli członka");
    }

    // 2. Verify target member exists and get current role
    const { data: targetMember, error: targetError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .limit(1)
      .single();

    if (targetError || !targetMember) {
      console.error("Target member not found:", targetError);
      throw new NotFoundError("Członek nie został znaleziony w tym workspace");
    }

    const oldRole = targetMember.role;

    // 3. Check if changing last owner's role (if current role is owner)
    if (oldRole === "owner" && newRole !== "owner") {
      // Count total owners in workspace
      const { count: ownerCount, error: countError } = await supabase
        .from("workspace_members")
        .select("user_id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("role", "owner");

      if (countError) {
        console.error("Error counting owners:", countError);
        throw new Error("Nie udało się zaktualizować roli członka");
      }

      // If only 1 owner exists, prevent role change
      if (ownerCount !== null && ownerCount === 1) {
        throw new InvalidOperationError("Nie można zmienić roli ostatniego właściciela workspace");
      }
    }

    // 4. Update member role
    const { data: updatedMember, error: updateError } = await supabase
      .from("workspace_members")
      .update({ role: newRole })
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating member role:", updateError);
      throw new Error("Nie udało się zaktualizować roli członka");
    }

    if (!updatedMember) {
      throw new Error("Nie udało się zaktualizować roli członka");
    }

    // 5. Log success
    console.info("PATCH /api/workspaces/:workspace_id/members/:user_id - Sukces:", {
      workspaceId: workspaceId,
      targetUserId: targetUserId,
      oldRole: oldRole,
      newRole: newRole,
      changedByUserId: currentUserId,
      timestamp: new Date().toISOString(),
    });

    // 6. Return updated member
    return updatedMember;
  } catch (error) {
    // Re-throw custom errors as-is
    if (
      error instanceof InsufficientPermissionsError ||
      error instanceof NotFoundError ||
      error instanceof InvalidOperationError
    ) {
      throw error;
    }

    // Log and throw unexpected errors
    console.error("Unexpected error in updateWorkspaceMemberRole:", {
      workspaceId: workspaceId,
      targetUserId: targetUserId,
      currentUserId: currentUserId,
      newRole: newRole,
      error: error instanceof Error ? error.message : "Nieznany błąd",
      timestamp: new Date().toISOString(),
    });
    throw error instanceof Error ? error : new Error("Nie udało się zaktualizować roli członka");
  }
}

/**
 * Removes a member from a workspace.
 *
 * Authorization rules:
 * - Any member can remove themselves (leave workspace)
 * - Owners and admins can remove other members (except the owner)
 * - Cannot remove the workspace owner
 *
 * @param supabase - Supabase client instance with user context
 * @param workspaceId - UUID of the workspace
 * @param targetUserId - UUID of the user to remove
 * @param currentUserId - UUID of the authenticated user making the request
 * @returns void on success
 * @throws NotFoundError if member not found in workspace
 * @throws InsufficientPermissionsError if user lacks permission to remove member
 * @throws OwnerRemovalError if attempting to remove workspace owner
 * @throws Error for database errors
 */
export async function removeWorkspaceMember(
  supabase: SupabaseClient,
  workspaceId: string,
  targetUserId: string,
  currentUserId: string
): Promise<void> {
  try {
    // 1. Check current user's membership and role
    const { data: currentMember, error: currentMemberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", currentUserId)
      .limit(1)
      .single();

    if (currentMemberError || !currentMember) {
      console.error("Current user not found in workspace:", currentMemberError);
      throw new NotFoundError("Workspace nie został znaleziony");
    }

    // 2. Check target user's membership and role
    const { data: targetMember, error: targetMemberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)
      .limit(1)
      .single();

    if (targetMemberError || !targetMember) {
      console.error("Target user not found in workspace:", targetMemberError);
      throw new NotFoundError("Członek nie został znaleziony");
    }

    // 3. Check if attempting to remove workspace owner
    if (targetMember.role === "owner") {
      throw new OwnerRemovalError();
    }

    // 4. Authorization check
    const isSelfRemoval = targetUserId === currentUserId;
    const hasAdminPermission = currentMember.role === "owner" || currentMember.role === "admin";

    if (!isSelfRemoval && !hasAdminPermission) {
      throw new InsufficientPermissionsError("Brak uprawnień do usunięcia tego członka");
    }

    // 5. Delete workspace member
    const { error: deleteError } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId);

    if (deleteError) {
      console.error("Error deleting workspace member:", deleteError);
      throw new Error("Nie udało się usunąć członka");
    }

    // 6. Log success
    console.info("DELETE /api/workspaces/:workspace_id/members/:user_id - Sukces:", {
      workspaceId: workspaceId,
      removedUserId: targetUserId,
      currentUserId: currentUserId,
      isSelfRemoval: isSelfRemoval,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Re-throw custom errors as-is
    if (
      error instanceof NotFoundError ||
      error instanceof InsufficientPermissionsError ||
      error instanceof OwnerRemovalError
    ) {
      throw error;
    }

    // Log and throw unexpected errors
    console.error("Unexpected error in removeWorkspaceMember:", {
      workspaceId: workspaceId,
      targetUserId: targetUserId,
      currentUserId: currentUserId,
      error: error instanceof Error ? error.message : "Nieznany błąd",
      timestamp: new Date().toISOString(),
    });
    throw error instanceof Error ? error : new Error("Nie udało się usunąć członka");
  }
}

/**
 * Updates a workspace's properties (name, description).
 *
 * Validates that the current user is the workspace owner and that at least one field
 * is provided for update. The database trigger `moddatetime` automatically updates the
 * `updated_at` timestamp.
 *
 * @param supabase - Supabase client instance with user context
 * @param workspaceId - UUID of the workspace to update
 * @param userId - UUID of the authenticated user (must be owner)
 * @param data - Update data (name and/or description)
 * @returns Updated workspace record
 * @throws WorkspaceOwnershipError if user is not workspace owner
 * @throws WorkspaceNotFoundError if workspace doesn't exist or not accessible
 * @throws Error for database errors
 */
export async function updateWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  data: PatchWorkspaceRequest
): Promise<PatchWorkspaceResponse> {
  try {
    // 1. Check user is workspace owner
    const { data: memberData, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (memberError || !memberData) {
      console.error("Error checking workspace ownership:", memberError);
      throw new WorkspaceNotFoundError();
    }

    if (memberData.role !== "owner") {
      throw new WorkspaceOwnershipError();
    }

    // 2. Prepare update object (only include provided fields)
    const updateObject: Record<string, string | null> = {};

    if (data.name !== undefined) {
      updateObject.name = data.name;
    }

    // Note: description is reserved for future use and not currently stored in database
    // It's accepted in request but not persisted (as per specification)

    // 3. Execute database update
    const { data: updatedWorkspace, error: updateError } = await supabase
      .from("workspaces")
      .update(updateObject)
      .eq("id", workspaceId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating workspace:", updateError);
      throw new Error("Nie udało się zaktualizować workspace'u");
    }

    if (!updatedWorkspace) {
      throw new WorkspaceNotFoundError();
    }

    // 4. Log success
    console.info("PATCH /api/workspaces/:workspace_id - Sukces:", {
      workspaceId: workspaceId,
      userId: userId,
      fields_updated: Object.keys(updateObject),
      timestamp: new Date().toISOString(),
    });

    // 5. Return updated workspace
    return updatedWorkspace as PatchWorkspaceResponse;
  } catch (error) {
    // Re-throw custom errors as-is
    if (error instanceof WorkspaceOwnershipError || error instanceof WorkspaceNotFoundError) {
      throw error;
    }

    // Log and throw unexpected errors
    console.error("Unexpected error in updateWorkspace:", {
      workspaceId: workspaceId,
      userId: userId,
      error: error instanceof Error ? error.message : "Nieznany błąd",
      timestamp: new Date().toISOString(),
    });
    throw error instanceof Error ? error : new Error("Nie udało się zaktualizować workspace'u");
  }
}

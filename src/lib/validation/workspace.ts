import { z } from "zod";
import { CommonValidation } from "./schemas";

/**
 * Workspace-specific validation schemas.
 * Used for workspace creation, updates, and member management.
 */

// ============= WORKSPACE CREATION & UPDATE =============

export const createWorkspaceSchema = z.object({
  name: CommonValidation.workspaceName,
});

export type CreateWorkspaceData = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  name: CommonValidation.workspaceName.optional(),
  description: z.string().max(1000).optional().nullable(),
});

export type UpdateWorkspaceData = z.infer<typeof updateWorkspaceSchema>;

// ============= WORKSPACE MEMBER MANAGEMENT =============

export const inviteWorkspaceMemberSchema = z.object({
  email: CommonValidation.email,
  role: z.enum(["owner", "admin", "member", "read_only"], {
    errorMap: () => ({ message: "Invalid role" }),
  }),
});

export type InviteWorkspaceMemberData = z.infer<typeof inviteWorkspaceMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(["owner", "admin", "member", "read_only"], {
    errorMap: () => ({ message: "Invalid role" }),
  }),
});

export type UpdateMemberRoleData = z.infer<typeof updateMemberRoleSchema>;

// ============= WORKSPACE VALIDATION UTILITY =============

/**
 * Validate workspace data exists and has required fields
 */
export function validateWorkspaceData(data: unknown): data is { id: string; name: string } {
  try {
    const schema = z.object({
      id: CommonValidation.uuid,
      name: CommonValidation.workspaceName,
    });
    schema.parse(data);
    return true;
  } catch {
    return false;
  }
}

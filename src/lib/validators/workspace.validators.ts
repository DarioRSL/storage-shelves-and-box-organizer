import { z } from "zod";

/**
 * Validation schema for PATCH /api/workspaces/:workspace_id URL parameter.
 * Validates the workspace ID from URL params.
 */
export const PatchWorkspaceParamsSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID workspace'u"),
});

/**
 * Type inference for workspace ID validation
 */
export type PatchWorkspaceParamsInput = z.infer<typeof PatchWorkspaceParamsSchema>;

/**
 * Validation schema for PATCH /api/workspaces/:workspace_id request body.
 * Validates partial workspace updates (name, description).
 * At least one field must be provided.
 *
 * Rules:
 * - name: optional, max 255 chars, will be trimmed
 * - description: optional (reserved for future use)
 * - At least one field must be provided
 */
export const PatchWorkspaceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nazwa workspace'a nie może być pusta")
      .max(255, "Nazwa workspace'a nie może przekraczać 255 znaków")
      .optional(),
    description: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Proszę podać co najmniej jedno pole do aktualizacji",
  });

/**
 * Type inference for patch workspace request body validation
 */
export type PatchWorkspaceInput = z.infer<typeof PatchWorkspaceSchema>;

/**
 * Validation schema for DELETE /api/workspaces/:workspace_id URL parameter.
 * Validates the workspace ID from URL params.
 */
export const DeleteWorkspaceParamsSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format identyfikatora przestrzeni roboczej"),
});

/**
 * Type inference for delete workspace parameter validation
 */
export type DeleteWorkspaceParamsInput = z.infer<typeof DeleteWorkspaceParamsSchema>;

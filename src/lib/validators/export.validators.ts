import { z } from "zod";

/**
 * Validation schema for GET /api/export/inventory query parameters.
 * Validates workspace_id (required UUID) and format (optional, defaults to 'csv').
 *
 * Rules:
 * - workspace_id: required, must be valid UUID v4 format
 * - format: optional, must be 'csv' or 'json' (case-insensitive), defaults to 'csv'
 */
export const ExportInventoryQuerySchema = z
  .object({
    workspace_id: z.string().uuid("Nieprawidłowy format workspace_id (musi być UUID)"),
    format: z
      .string()
      .transform((v) => v.toLowerCase())
      .refine((v) => ["csv", "json"].includes(v), {
        message: "Nieprawidłowy format: musi być 'csv' lub 'json'",
      })
      .default("csv"),
  })
  .strict();

/**
 * Type inference for export inventory query validation
 */
export type ExportInventoryQueryInput = z.infer<typeof ExportInventoryQuerySchema>;

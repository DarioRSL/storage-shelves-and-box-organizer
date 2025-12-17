import { z } from "zod";

/**
 * Validation schema for creating a new location.
 * Validates the request body for POST /api/locations endpoint.
 */
export const CreateLocationSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID przestrzeni roboczej"),
  name: z
    .string()
    .min(1, "Nazwa lokalizacji jest wymagana")
    .max(255, "Nazwa lokalizacji może mieć maksymalnie 255 znaków")
    .trim(),
  description: z.string().max(1000, "Opis może mieć maksymalnie 1000 znaków").nullable().optional(),
  parent_id: z.string().uuid("Nieprawidłowy format ID lokalizacji nadrzędnej").nullable().optional(),
});

/**
 * Type inference from Zod schema for type safety
 */
export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;

/**
 * Validation schema for GET /api/locations query parameters.
 * Validates workspace_id (required) and parent_id (optional) for retrieving locations.
 */
export const GetLocationsQuerySchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID przestrzeni roboczej"),
  parent_id: z.string().uuid("Nieprawidłowy format ID lokalizacji nadrzędnej").nullable().optional(),
});

/**
 * Type inference from Zod schema for type safety
 */
export type GetLocationsQueryInput = z.infer<typeof GetLocationsQuerySchema>;

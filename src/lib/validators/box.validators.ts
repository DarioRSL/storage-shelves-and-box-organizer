import { z } from "zod";
import { ValidationRules } from "@/types";

/**
 * Validation schema for creating a new box.
 * Validates the request body for POST /api/boxes endpoint.
 */
export const CreateBoxSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format ID obszaru roboczego"),
  name: z.string().min(1, "Nazwa pudełka jest wymagana").trim(),
  description: z
    .string()
    .max(
      ValidationRules.boxes.MAX_DESCRIPTION_LENGTH,
      `Opis nie może przekraczać ${ValidationRules.boxes.MAX_DESCRIPTION_LENGTH} znaków`
    )
    .nullable()
    .optional(),
  tags: z
    .array(z.string(), {
      invalid_type_error: "Tagi muszą być tablicą ciągów znaków",
    })
    .nullable()
    .optional(),
  location_id: z.string().uuid("Nieprawidłowy format ID lokalizacji").nullable().optional(),
  qr_code_id: z.string().uuid("Nieprawidłowy format ID kodu QR").nullable().optional(),
});

/**
 * Type inference from Zod schema for type safety
 */
export type CreateBoxInput = z.infer<typeof CreateBoxSchema>;

/**
 * Validation schema for GET /api/boxes query parameters.
 * Validates search, filter, and pagination parameters.
 */
export const GetBoxesQuerySchema = z.object({
  workspace_id: z
    .string({ required_error: "workspace_id jest wymagane" })
    .min(1, "workspace_id jest wymagane")
    .uuid("Nieprawidłowy format ID obszaru roboczego"),
  q: z
    .string()
    .min(1, "Zapytanie wyszukiwania nie może być puste")
    .nullable()
    .optional()
    .transform((val) => val || undefined),
  location_id: z
    .string()
    .uuid("Nieprawidłowy format ID lokalizacji")
    .nullable()
    .optional()
    .transform((val) => val || undefined),
  is_assigned: z
    .string()
    .nullable()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  limit: z
    .string()
    .nullable()
    .optional()
    .default("50")
    .transform((val) => parseInt(val || "50", 10))
    .pipe(z.number().positive().max(100)),
  offset: z
    .string()
    .nullable()
    .optional()
    .default("0")
    .transform((val) => parseInt(val || "0", 10))
    .pipe(z.number().nonnegative()),
});

/**
 * Type inference for GET boxes query parameters
 */
export type GetBoxesQueryInput = z.infer<typeof GetBoxesQuerySchema>;

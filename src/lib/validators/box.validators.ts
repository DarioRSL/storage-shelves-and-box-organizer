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

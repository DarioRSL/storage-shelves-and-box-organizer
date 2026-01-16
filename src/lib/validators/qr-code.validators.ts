import { z } from "zod";
import { ValidationRules } from "@/types";

/**
 * Validation schema for GET /api/qr-codes/:short_id URL parameter.
 * Validates the QR code short_id format.
 */
export const GetQrCodeByShortIdSchema = z.object({
  short_id: z.string().regex(/^QR-[A-Z0-9]{6}$/, "Nieprawidłowy format ID kodu QR. Oczekiwany format: QR-XXXXXX"),
});

/**
 * Type inference from Zod schema for type safety
 */
export type GetQrCodeByShortIdInput = z.infer<typeof GetQrCodeByShortIdSchema>;

/**
 * Validation schema for POST /api/qr-codes/batch request body.
 * Validates workspace_id (UUID) and quantity (1-100).
 */
export const BatchGenerateQrCodesRequestSchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format workspace_id"),
  quantity: z
    .number()
    .int("Ilość musi być liczbą całkowitą")
    .min(ValidationRules.qrCodes.MIN_BATCH_QUANTITY, "Ilość musi wynosić co najmniej 1")
    .max(ValidationRules.qrCodes.MAX_BATCH_QUANTITY, "Ilość nie może przekraczać 100"),
});

/**
 * Type inference from Zod schema for type safety
 */
export type BatchGenerateQrCodesRequestInput = z.infer<typeof BatchGenerateQrCodesRequestSchema>;

import { z } from "zod";

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

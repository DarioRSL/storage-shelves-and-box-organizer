import type { APIRoute } from "astro";
import { getQrCodeByShortId, QrCodeNotFoundError } from "@/lib/services/qr-code.service";
import { GetQrCodeByShortIdSchema } from "@/lib/validators/qr-code.validators";
import type { QrCodeDetailDto, ErrorResponse } from "@/types";
import { log } from "@/lib/services/logger";

export const prerender = false;

/**
 * GET /api/qr-codes/:short_id
 * Resolves a scanned QR code to its current status and associated box information.
 *
 * URL Parameters:
 * - short_id (required): QR code short ID (format: QR-XXXXXX)
 *
 * Returns 200 OK with QrCodeDetailDto on success.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication using context.locals.user (already authenticated by middleware)
    const user = locals.user;

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "Nieautoryzowany dostęp",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Extract and validate short_id from URL params
    const parseResult = GetQrCodeByShortIdSchema.safeParse({ short_id: params.short_id });

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: firstError.message,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { short_id } = parseResult.data;

    // 4. Call service layer to fetch QR code
    try {
      const qrCode: QrCodeDetailDto = await getQrCodeByShortId(supabase, short_id, user.id);

      // 5. Return success response (200 OK)
      return new Response(JSON.stringify(qrCode), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle QrCodeNotFoundError (404)
      if (error instanceof QrCodeNotFoundError) {
        return new Response(
          JSON.stringify({
            error: error.message,
          } as ErrorResponse),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle generic service errors (500)
      log.error("Service layer error", {
        endpoint: "GET /api/qr-codes/:short_id",
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Nie udało się pobrać kodu QR",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors (500)
    log.error("Unexpected error in API endpoint", {
      endpoint: "GET /api/qr-codes/:short_id",
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({
        error: "Wewnętrzny błąd serwera",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

import type { SupabaseClient } from "@/db/supabase.client";
import type { QrCodeDetailDto } from "@/types";

/**
 * Custom error for QR code not found in database.
 * HTTP Status: 404 Not Found
 */
export class QrCodeNotFoundError extends Error {
  constructor(message = "Kod QR nie został znaleziony") {
    super(message);
    this.name = "QrCodeNotFoundError";
  }
}

/**
 * Retrieves a single QR code by its short_id for scanning workflow.
 *
 * Business logic:
 * 1. Query qr_codes table by short_id
 * 2. RLS automatically enforces workspace membership
 * 3. Return QrCodeDetailDto or throw QrCodeNotFoundError
 *
 * @param supabase - Supabase client instance
 * @param shortId - Short ID of the QR code (format: QR-XXXXXX)
 * @param userId - ID of the authenticated user (for logging)
 * @returns QrCodeDetailDto with box_id, status, and workspace_id
 * @throws QrCodeNotFoundError if QR code doesn't exist or user lacks access
 */
export async function getQrCodeByShortId(
  supabase: SupabaseClient,
  shortId: string,
  userId: string
): Promise<QrCodeDetailDto> {
  try {
    // Query qr_code by short_id
    const { data, error } = await supabase
      .from("qr_codes")
      .select("id, short_id, box_id, status, workspace_id")
      .eq("short_id", shortId)
      .single();

    // Handle Supabase errors
    if (error) {
      console.error("Error fetching QR code:", {
        short_id: shortId,
        user_id: userId,
        error: error.message,
        code: error.code,
      });

      // PGRST116 = no rows returned (either doesn't exist or RLS denied)
      if (error.code === "PGRST116") {
        throw new QrCodeNotFoundError();
      }

      throw new Error("Nie udało się pobrać kodu QR");
    }

    // Additional null check (should not happen with .single())
    if (!data) {
      console.warn("QR code not found or access denied:", {
        short_id: shortId,
        user_id: userId,
      });
      throw new QrCodeNotFoundError();
    }

    // Log successful retrieval
    console.log("QR code fetched successfully:", {
      qr_code_id: data.id,
      short_id: data.short_id,
      user_id: userId,
      workspace_id: data.workspace_id,
      is_assigned: !!data.box_id,
    });

    return data;
  } catch (error) {
    // Re-throw QrCodeNotFoundError as-is
    if (error instanceof QrCodeNotFoundError) {
      throw error;
    }

    // Log unexpected errors
    console.error("Unexpected error in getQrCodeByShortId:", {
      short_id: shortId,
      user_id: userId,
      error,
    });

    // Re-throw or wrap errors
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Nie udało się pobrać kodu QR");
  }
}

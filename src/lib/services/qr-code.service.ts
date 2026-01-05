import type { SupabaseClient } from "@/db/supabase.client";
import type { QrCodeDetailDto, BatchGenerateQrCodesRequest, BatchGenerateQrCodesResponse } from "@/types";
import { log } from "./logger";

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
      log.error("Failed to fetch QR code by short ID", { shortId, userId, error: error.message, code: error.code });

      // PGRST116 = no rows returned (either doesn't exist or RLS denied)
      if (error.code === "PGRST116") {
        throw new QrCodeNotFoundError();
      }

      throw new Error("Nie udało się pobrać kodu QR");
    }

    // Additional null check (should not happen with .single())
    if (!data) {
      log.warn("QR code not found or access denied", { shortId, userId });
      throw new QrCodeNotFoundError();
    }

    // Log successful retrieval
    log.debug("QR code fetched successfully", { qrCodeId: data.id, shortId: data.short_id, userId, workspaceId: data.workspace_id });

    return data;
  } catch (error) {
    // Re-throw QrCodeNotFoundError as-is
    if (error instanceof QrCodeNotFoundError) {
      throw error;
    }

    // Log unexpected errors
    log.error("Unexpected error in getQrCodeByShortId", { shortId, userId, error: error instanceof Error ? error.message : String(error) });

    // Re-throw or wrap errors
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Nie udało się pobrać kodu QR");
  }
}

/**
 * Retrieves all QR codes for a workspace, optionally filtered by status.
 *
 * Business logic:
 * 1. Query qr_codes table by workspace_id
 * 2. Optionally filter by status (generated, assigned, printed)
 * 3. RLS automatically enforces workspace membership
 * 4. Return array of QR codes
 *
 * @param supabase - Supabase client instance
 * @param workspaceId - UUID of the workspace
 * @param status - Optional status filter
 * @returns Promise<QrCodeDetailDto[]> - Array of QR codes
 */
export async function getQrCodesForWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  status?: string
): Promise<QrCodeDetailDto[]> {
  try {
    let query = supabase
      .from("qr_codes")
      .select("id, short_id, box_id, status, workspace_id")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    // Add status filter if provided
    if (status) {
      query = query.eq("status", status as "generated" | "assigned" | "printed");
    }

    const { data, error } = await query;

    if (error) {
      log.error("Failed to fetch QR codes for workspace", { workspaceId, status, error: error.message });
      throw new Error("Nie udało się pobrać kodów QR");
    }

    return data || [];
  } catch (error) {
    log.error("Unexpected error in getQrCodesForWorkspace", { workspaceId, status, error: error instanceof Error ? error.message : String(error) });

    // Return empty array on error to not break UI
    return [];
  }
}

/**
 * Verifies that the authenticated user is a member of the specified workspace.
 *
 * Business logic:
 * 1. Query workspace_members table by workspace_id and user_id
 * 2. Return true if membership exists, false otherwise
 *
 * @param supabase - Supabase client instance
 * @param workspace_id - UUID of the workspace
 * @param user_id - UUID of the authenticated user
 * @returns Promise<boolean> - true if user is a member, false otherwise
 */
export async function isWorkspaceMember(
  supabase: SupabaseClient,
  workspace_id: string,
  user_id: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a batch of QR codes for a workspace.
 * Creates multiple QR code records with unique short IDs and status 'generated'.
 *
 * Business logic:
 * 1. Create array of QR code records (quantity times)
 * 2. Set status to 'generated' for all records
 * 3. Bulk insert into qr_codes table
 * 4. Database trigger generates unique short_id for each record
 * 5. Return array of inserted QR codes with their short_ids
 *
 * @param supabase - Supabase client instance
 * @param request - Batch generation request (workspace_id, quantity)
 * @returns Promise<BatchGenerateQrCodesResponse> - Array of generated QR codes
 * @throws Error if database operation fails or short_id generation fails
 */
export async function batchGenerateQrCodes(
  supabase: SupabaseClient,
  request: BatchGenerateQrCodesRequest
): Promise<BatchGenerateQrCodesResponse> {
  const { workspace_id, quantity } = request;

  try {
    // Prepare batch insert records
    // short_id will be auto-generated by database trigger
    const records = Array.from({ length: quantity }, () => ({
      workspace_id,
      status: "generated" as const,
    })) as never[];

    // Bulk insert QR codes
    const { data, error } = await supabase
      .from("qr_codes")
      .insert(records)
      .select("id, short_id, status, workspace_id, created_at");

    if (error) {
      log.error("Failed to batch generate QR codes", { workspaceId: workspace_id, quantity, error: error.message, code: error.code });
      throw new Error("Nie udało się wygenerować kodów QR");
    }

    if (!data || data.length !== quantity) {
      log.error("Generated QR codes count mismatch", { workspaceId: workspace_id, expected: quantity, actual: data?.length || 0 });
      throw new Error("Nie udało się wygenerować wszystkich kodów QR");
    }

    return {
      data: data.map((qr) => ({
        id: qr.id,
        short_id: qr.short_id,
        status: qr.status,
        workspace_id: qr.workspace_id,
        created_at: qr.created_at,
      })),
    };
  } catch (error) {
    // Re-throw already thrown errors
    if (error instanceof Error && error.message.includes("Nie udało się")) {
      throw error;
    }

    // Log unexpected errors
    log.error("Unexpected error in batchGenerateQrCodes", { workspaceId: workspace_id, quantity, error: error instanceof Error ? error.message : String(error) });

    throw new Error("Nie udało się wygenerować kodów QR");
  }
}

import type { APIRoute } from "astro";
import { batchGenerateQrCodes, isWorkspaceMember } from "@/lib/services/qr-code.service";
import { BatchGenerateQrCodesRequestSchema } from "@/lib/validators/qr-code.validators";
import type { ErrorResponse, BatchGenerateQrCodesRequest } from "@/types";

export const prerender = false;

/**
 * POST /api/qr-codes/batch
 * Generates a batch of new QR codes for a workspace.
 *
 * Request body:
 * {
 *   "workspace_id": "uuid",
 *   "quantity": number (1-100)
 * }
 *
 * Returns 201 Created with array of generated QR codes.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication using context.locals.user (already authenticated by middleware)
    const user = locals.user;

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "Brak autoryzacji",
        } as ErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowy format JSON w treści żądania",
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Validate input with Zod schema
    const parseResult = BatchGenerateQrCodesRequestSchema.safeParse(body);

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

    const validatedRequest: BatchGenerateQrCodesRequest = parseResult.data;

    // 5. Authorization: Check workspace membership
    const isMember = await isWorkspaceMember(supabase, validatedRequest.workspace_id, user.id);

    if (!isMember) {
      console.warn("[POST /api/qr-codes/batch] Unauthorized workspace access:", {
        user_id: user.id,
        workspace_id: validatedRequest.workspace_id,
      });

      return new Response(
        JSON.stringify({
          error: "Nie masz dostępu do tego obszaru roboczego",
        } as ErrorResponse),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 6. Generate QR codes
    try {
      const response = await batchGenerateQrCodes(supabase, validatedRequest);

      // 7. Log success
      console.log("[POST /api/qr-codes/batch] Success:", {
        user_id: user.id,
        workspace_id: validatedRequest.workspace_id,
        quantity: validatedRequest.quantity,
        generated_count: response.data.length,
      });

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle service layer errors
      console.error("[POST /api/qr-codes/batch] Service error:", {
        user_id: user.id,
        workspace_id: validatedRequest.workspace_id,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return new Response(
        JSON.stringify({
          error: "Nie udało się wygenerować kodów QR",
        } as ErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Unexpected errors
    console.error("[POST /api/qr-codes/batch] Unexpected error:", {
      error: error instanceof Error ? error.message : "Unknown error",
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

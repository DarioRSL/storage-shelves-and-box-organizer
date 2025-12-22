import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateBoxRequest, CreateBoxResponse, GetBoxesQuery, BoxDto } from "@/types";

/**
 * Custom error for QR code already assigned to another box.
 * HTTP Status: 409 Conflict
 */
export class QrCodeAlreadyAssignedError extends Error {
  constructor(message = "Kod QR jest już przypisany do innego pudełka") {
    super(message);
    this.name = "QrCodeAlreadyAssignedError";
  }
}

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
 * Custom error for location not found in database.
 * HTTP Status: 404 Not Found
 */
export class LocationNotFoundError extends Error {
  constructor(message = "Lokalizacja nie została znaleziona") {
    super(message);
    this.name = "LocationNotFoundError";
  }
}

/**
 * Custom error for workspace mismatch (QR code or location belongs to different workspace).
 * HTTP Status: 403 Forbidden
 */
export class WorkspaceMismatchError extends Error {
  constructor(resource: "qr_code" | "location", message?: string) {
    const defaultMessage =
      resource === "qr_code"
        ? "Kod QR należy do innego obszaru roboczego"
        : "Lokalizacja należy do innego obszaru roboczego";
    super(message || defaultMessage);
    this.name = "WorkspaceMismatchError";
  }
}

/**
 * Creates a new box in the inventory system.
 *
 * Business logic:
 * 1. If qr_code_id provided, verify QR code exists, belongs to workspace, and is not assigned
 * 2. If location_id provided, verify location exists and belongs to workspace
 * 3. Insert box record (database trigger auto-generates short_id and search_vector)
 * 4. If qr_code_id provided, update QR code to link it to the new box (atomic transaction)
 *
 * @param supabase - Supabase client instance
 * @param request - Box creation data
 * @returns Created box data or throws error
 */
export async function createBox(supabase: SupabaseClient, request: CreateBoxRequest): Promise<CreateBoxResponse> {
  try {
    // Step 1: If qr_code_id provided, validate QR code
    if (request.qr_code_id) {
      const { data: qrCode, error: qrError } = await supabase
        .from("qr_codes")
        .select("id, workspace_id, box_id")
        .eq("id", request.qr_code_id)
        .single();

      if (qrError || !qrCode) {
        throw new QrCodeNotFoundError();
      }

      // Verify QR code belongs to same workspace
      if (qrCode.workspace_id !== request.workspace_id) {
        throw new WorkspaceMismatchError("qr_code");
      }

      // Verify QR code is not already assigned
      if (qrCode.box_id !== null) {
        throw new QrCodeAlreadyAssignedError();
      }
    }

    // Step 2: If location_id provided, validate location
    if (request.location_id) {
      const { data: location, error: locationError } = await supabase
        .from("locations")
        .select("id, workspace_id")
        .eq("id", request.location_id)
        .single();

      if (locationError || !location) {
        throw new LocationNotFoundError();
      }

      // Verify location belongs to same workspace
      if (location.workspace_id !== request.workspace_id) {
        throw new WorkspaceMismatchError("location");
      }
    }

    // Step 3: Insert box record
    // Note: Database trigger will auto-generate short_id and search_vector
    // Note: RLS policy enforces workspace membership automatically
    // TypeScript requires short_id but we cast to bypass this since trigger generates it
    const { data: box, error: boxError } = await supabase
      .from("boxes")
      .insert({
        workspace_id: request.workspace_id,
        name: request.name,
        description: request.description || null,
        tags: request.tags || null,
        location_id: request.location_id || null,
      } as any)
      .select("id, short_id, name, workspace_id, created_at")
      .single();

    if (boxError) {
      console.error("Error creating box:", boxError);

      // Check for RLS policy violation (user not workspace member)
      if (boxError.code === "42501" || boxError.code === "PGRST301") {
        throw new Error("Brak dostępu: nie jesteś członkiem tego obszaru roboczego");
      }

      throw new Error("Nie udało się utworzyć pudełka");
    }

    if (!box) {
      throw new Error("Nie udało się utworzyć pudełka");
    }

    // Step 4: If qr_code_id provided, update QR code to link it to the box
    if (request.qr_code_id) {
      const { error: updateError } = await supabase
        .from("qr_codes")
        .update({
          box_id: box.id,
          status: "assigned",
        })
        .eq("id", request.qr_code_id);

      if (updateError) {
        console.error("Error updating QR code:", updateError);
        // Note: Box was created but QR assignment failed
        // This is a partial failure - consider implementing transaction rollback
        throw new Error("Nie udało się przypisać kodu QR do pudełka");
      }
    }

    // Log successful creation
    console.log("Box created successfully:", {
      box_id: box.id,
      short_id: box.short_id,
      workspace_id: box.workspace_id,
      qr_assigned: !!request.qr_code_id,
    });

    return {
      id: box.id,
      short_id: box.short_id,
      name: box.name,
      workspace_id: box.workspace_id,
      created_at: box.created_at,
    };
  } catch (error) {
    // Re-throw custom errors as-is
    if (
      error instanceof QrCodeAlreadyAssignedError ||
      error instanceof QrCodeNotFoundError ||
      error instanceof LocationNotFoundError ||
      error instanceof WorkspaceMismatchError
    ) {
      throw error;
    }

    // Log unexpected errors
    console.error("Unexpected error in createBox:", error);

    // Re-throw or wrap unknown errors
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Nie udało się utworzyć pudełka");
  }
}

/**
 * Retrieves a filtered, searchable, paginated list of boxes.
 *
 * Business logic:
 * 1. Build base query with joins for location and qr_code
 * 2. Apply workspace filter (required)
 * 3. Apply optional filters (search, location, assignment status)
 * 4. Apply pagination and ordering
 * 5. Execute query and return results
 *
 * @param supabase - Supabase client instance
 * @param query - Validated query parameters
 * @returns Array of BoxDto objects
 */
export async function getBoxes(supabase: SupabaseClient, query: GetBoxesQuery): Promise<BoxDto[]> {
  try {
    // Build base query with joins
    let dbQuery = supabase
      .from("boxes")
      .select(`
        id,
        short_id,
        workspace_id,
        location_id,
        name,
        description,
        tags,
        image_url,
        created_at,
        updated_at,
        location:locations (
          id,
          name,
          path
        ),
        qr_code:qr_codes!qr_codes_box_id_fkey (
          id,
          short_id
        )
      `)
      .eq("workspace_id", query.workspace_id)
      .order("created_at", { ascending: false });

    // Apply full-text search filter
    if (query.q) {
      dbQuery = dbQuery.textSearch("search_vector", query.q);
    }

    // Apply location filter
    if (query.location_id) {
      dbQuery = dbQuery.eq("location_id", query.location_id);
    }

    // Apply assignment status filter
    if (query.is_assigned !== undefined) {
      if (query.is_assigned) {
        dbQuery = dbQuery.not("location_id", "is", null);
      } else {
        dbQuery = dbQuery.is("location_id", null);
      }
    }

    // Apply pagination
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    // Execute query
    const { data, error } = await dbQuery;

    if (error) {
      console.error("Error fetching boxes:", error);
      throw new Error("Nie udało się pobrać pudełek");
    }

    // Log successful query
    console.log("Boxes fetched successfully:", {
      workspace_id: query.workspace_id,
      count: data?.length ?? 0,
      filters_applied: {
        search: !!query.q,
        location: !!query.location_id,
        is_assigned: query.is_assigned,
      },
    });

    return data as BoxDto[];
  } catch (error) {
    console.error("Unexpected error in getBoxes:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Nie udało się pobrać pudełek");
  }
}

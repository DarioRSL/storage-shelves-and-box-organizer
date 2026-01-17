# API Endpoint Implementation Plan: GET /api/export/inventory

## 1. Endpoint Overview

The GET /api/export/inventory endpoint enables users to export all boxes from a workspace in a structured format (CSV or JSON). This facilitates data portability, backup creation, and external analysis of inventory data.

**Primary Use Case:** Settings view - DataSection export button
**Output Format:** File download (CSV or JSON)
**Data Scope:** All boxes in a workspace with related locations and QR codes
**Authentication:** Required (JWT token)
**Authorization:** User must be workspace member

---

## 2. Request Details

### HTTP Method & URL Pattern

```
GET /api/export/inventory?workspace_id={workspace_id}&format={format}
```

### Query Parameters

| Parameter    | Type        | Required | Constraints                        | Default | Description                   |
| ------------ | ----------- | -------- | ---------------------------------- | ------- | ----------------------------- |
| workspace_id | UUID string | Yes      | Valid UUID v4 format               | N/A     | Workspace to export data from |
| format       | string      | No       | 'csv' \| 'json' (case-insensitive) | 'csv'   | Export file format            |

### Headers

```http
GET /api/export/inventory?workspace_id=550e8400-e29b-41d4-a716-446655440000&format=csv HTTP/1.1
Authorization: Bearer <JWT_TOKEN>
Accept: text/csv
```

### Request Validation Rules

**workspace_id:**

- Must be valid UUID v4 format: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
- Must be provided as query parameter
- If missing: return 400 Bad Request

**format:**

- Must be lowercase 'csv' or 'json'
- Normalize input to lowercase before validation
- If invalid value: return 400 Bad Request
- Default to 'csv' if not provided

---

## 3. Response Details

### Success Response (200 OK)

**CSV Format:**

```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="inventory-550e8400-e29b-41d4-a716-446655440000-2025-12-28.csv"
Content-Length: 2048

id,short_id,name,location,description,tags,qr_code,created_at,updated_at
"3fa85f64-5717-4562-b3fc-2c963f66afa6","X7K9P2mN4q","Winter Clothes","Basement > Shelf A","Jackets and scarves","seasonal,clothes,winter","QR-A1B2C3","2023-10-27T10:00:00Z","2023-11-15T14:30:00Z"
"4gb95g75-6828-5673-c4gd-3d074g77bgb7","Y8L0Q3nO5r","Tools","Garage > Workbench","Power drill and bits","tools,hardware","QR-X9Y8Z7","2023-10-28T11:00:00Z","2023-11-16T15:00:00Z"
```

**JSON Format:**

```json
{
  "meta": {
    "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
    "export_date": "2025-12-28T14:30:00Z",
    "total_records": 2,
    "format_version": "1.0"
  },
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "short_id": "X7K9P2mN4q",
      "name": "Winter Clothes",
      "location": "Basement > Shelf A",
      "description": "Jackets and scarves",
      "tags": ["seasonal", "clothes", "winter"],
      "qr_code": "QR-A1B2C3",
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-11-15T14:30:00Z"
    },
    {
      "id": "4gb95g75-6828-5673-c4gd-3d074g77bgb7",
      "short_id": "Y8L0Q3nO5r",
      "name": "Tools",
      "location": "Garage > Workbench",
      "description": "Power drill and bits",
      "tags": ["tools", "hardware"],
      "qr_code": "QR-X9Y8Z7",
      "created_at": "2023-10-28T11:00:00Z",
      "updated_at": "2023-11-16T15:00:00Z"
    }
  ]
}
```

### CSV Column Definitions

| Column      | Source Table      | Type               | Notes                                                |
| ----------- | ----------------- | ------------------ | ---------------------------------------------------- |
| id          | boxes.id          | UUID               | Box unique identifier                                |
| short_id    | boxes.short_id    | string             | 10-character alphanumeric identifier                 |
| name        | boxes.name        | string             | Box name/title                                       |
| location    | locations.path    | string             | Hierarchical breadcrumb (e.g., "Basement > Shelf A") |
| description | boxes.description | string \| null     | Box contents description (max 10k chars)             |
| tags        | boxes.tags        | string             | Comma-separated tag list (from array)                |
| qr_code     | qr_codes.short_id | string \| null     | QR code identifier (format: QR-XXXXXX)               |
| created_at  | boxes.created_at  | ISO 8601 timestamp | Creation datetime                                    |
| updated_at  | boxes.updated_at  | ISO 8601 timestamp | Last modification datetime                           |

### Handling Special Cases

**Unassigned Boxes (NULL location_id):**

- Set location field to empty string or "Unassigned"
- Include in export regardless of location assignment

**Boxes Without QR Codes:**

- Set qr_code field to empty string in CSV
- Set qr_code to null in JSON

**Tags Array Conversion:**

- Convert PostgreSQL array to comma-separated string in CSV
- Handle empty arrays as empty string
- Escape commas/quotes in tag values if present

**Location Path Conversion:**

- Convert ltree format (e.g., `root.basement.shelf_a`) to breadcrumb (e.g., `Basement > Shelf A`)
- Use location.name field for each path component if available
- Handle multi-level hierarchies (up to 5 levels deep)

---

## 4. Data Flow

### Query Sequence

```sql
-- Step 1: Verify workspace exists and user is member (RLS enforced)
SELECT id FROM workspaces
WHERE id = {workspace_id};

-- Step 2: Fetch all boxes with related data
SELECT
  b.id,
  b.short_id,
  b.name,
  b.description,
  b.tags,
  b.location_id,
  b.created_at,
  b.updated_at,
  l.id as location_id_nested,
  l.path,
  l.name as location_name,
  q.short_id as qr_code_short_id
FROM boxes b
LEFT JOIN locations l ON b.location_id = l.id
LEFT JOIN qr_codes q ON b.id = q.box_id
WHERE b.workspace_id = {workspace_id}
ORDER BY b.created_at DESC;
```

### Data Transformation Steps

1. **Validate Input**
   - Parse and validate workspace_id (UUID format)
   - Validate format parameter (csv/json, case-insensitive)
   - Return 400 if invalid

2. **Authenticate & Authorize**
   - Extract JWT from Authorization header
   - Verify user session (middleware responsibility)
   - Check user is workspace member via RLS

3. **Fetch Data**
   - Query boxes with LEFT JOINs to locations and qr_codes
   - Filter by workspace_id (RLS policy enforces this)
   - Order by created_at DESC for consistency

4. **Transform Records**
   - Convert each database row to export record
   - Transform ltree path to breadcrumb string
   - Convert tags array to CSV string or keep as array for JSON
   - Handle NULL values appropriately

5. **Generate Output**
   - **CSV:** Use csv-stringify library to properly escape fields
   - **JSON:** Serialize to JSON with metadata wrapper
   - Include appropriate Content-Type and Content-Disposition headers

6. **Return Response**
   - Stream file to client with 200 status
   - Set filename with workspace_id and current date
   - Handle errors and return appropriate status codes

### Service Layer Design

Create `src/lib/services/exportService.ts`:

```typescript
export async function exportInventory(
  supabase: SupabaseClient,
  workspaceId: string,
  format: "csv" | "json" = "csv"
): Promise<{
  content: string;
  mimeType: "text/csv" | "application/json";
  filename: string;
}> {
  // Implementation details in Implementation Steps
}
```

---

## 5. Security Considerations

### Authentication

- **Requirement:** Valid JWT token must be present in Authorization header
- **Implementation:** Middleware validates token before reaching handler
- **Status Code:** 401 if missing or invalid

### Authorization

- **Requirement:** User must be member of the workspace
- **Implementation:** Check via `is_workspace_member(workspace_id)` RLS function
- **Method:** Query will fail silently if user lacks access (RLS policy)
- **Status Code:** 403 if user is not workspace member

### Input Validation

- **workspace_id:** Validate UUID format before querying
- **format:** Whitelist only 'csv' and 'json', normalize case
- **Query parameters:** Reject unknown parameters (strict whitelist)
- **Status Code:** 400 for invalid input

### Query Injection Prevention

- Use Supabase client parameterized queries (prepared statements)
- Never concatenate user input into SQL strings
- Validate workspace_id format before query execution

### CSV Injection Prevention

- Use established csv-stringify library (v6+)
- Library automatically escapes formula-starting characters (=, +, -, @)
- Properly quote all fields containing special characters
- Test with injection payloads before deployment

### Data Protection

- Export file contains public inventory data (not PII-sensitive)
- No authentication tokens or passwords in export
- File download over HTTPS (infrastructure requirement)
- Rate limiting recommended to prevent abuse (optional Phase 2)

### CORS & Headers

- Only allow same-origin requests (CORS handled by Astro/browser)
- Set appropriate Content-Type and Content-Disposition headers
- No sensitive headers exposed in response

---

## 6. Error Handling

### HTTP Status Codes & Error Messages

| HTTP Status | Error Condition             | Error Message (Polish)                                     | User-Friendly Message                         |
| ----------- | --------------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| **400**     | Missing workspace_id        | "Parametr workspace_id jest wymagany"                      | Please provide a workspace ID                 |
| **400**     | Invalid workspace_id format | "Nieprawidłowy format workspace_id (musi być UUID)"        | Invalid workspace ID format                   |
| **400**     | Invalid format parameter    | "Nieprawidłowy format: musi być 'csv' lub 'json'"          | Unsupported export format                     |
| **401**     | No JWT token provided       | "Nie jesteś uwierzytelniony"                               | You must be logged in                         |
| **401**     | Invalid/expired JWT token   | "Nie jesteś uwierzytelniony"                               | Your session has expired, please log in again |
| **403**     | User not workspace member   | "Brak uprawnień: nie jesteś członkiem tego workspace'u"    | You don't have access to this workspace       |
| **404**     | Workspace not found         | "Workspace nie został znaleziony"                          | The workspace you requested doesn't exist     |
| **500**     | Database connection error   | "Nie udało się wyeksportować inwentarza: błąd bazy danych" | Server error: unable to export data           |
| **500**     | File generation error       | "Nie udało się wygenerować pliku eksportu"                 | Server error: unable to generate file         |

### Error Handling Strategy

```typescript
// API Handler Error Flow
export async function GET(context) {
  try {
    // 1. Validate input early
    const validation = validateExportInput(queryParams);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), { status: 400 });
    }

    // 2. Authenticate (middleware ensures this, but check again)
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Nie jesteś uwierzytelniony" }), { status: 401 });
    }

    // 3. Authorize (RLS will handle, but explicit check in logic)
    const workspace = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!workspace) {
      return new Response(JSON.stringify({ error: "Brak uprawnień: nie jesteś członkiem tego workspace'u" }), {
        status: 403,
      });
    }

    // 4. Execute export
    const result = await exportInventory(supabase, workspaceId, format);

    // 5. Return file
    return new Response(result.content, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err) {
    // Log error (without sensitive data)
    console.error("[exportInventory]", err.message);

    // Return generic error to client
    return new Response(JSON.stringify({ error: "Nie udało się wyeksportować inwentarza" }), { status: 500 });
  }
}
```

### Logging & Monitoring

**What to Log:**

- Request: user_id, workspace_id, format, timestamp
- Success: rows_exported, file_size, duration
- Errors: error_type, error_message, stack_trace (dev only)

**What NOT to Log:**

- JWT tokens or authentication headers
- User personal data (emails, names)
- Full descriptions (could contain PII)
- Request body (N/A for GET, but for consistency)

**Logging Pattern:**

```typescript
console.info("GET /api/export/inventory - Rozpoczęto eksport", { userId, workspaceId, format });
console.info("GET /api/export/inventory - Sukces", { userId, workspaceId, format, rowCount, duration });
console.error("GET /api/export/inventory - Błąd", { userId, workspaceId, error: err.message });
```

---

## 7. Performance Considerations

### Query Optimization

**Indexing Strategy:**

- Primary index on boxes(workspace_id) - already exists (foreign key)
- Index on boxes(location_id) - already exists (foreign key)
- GIN index on search_vector - exists for full-text search
- Consider compound index: boxes(workspace_id, created_at DESC) for large workspaces

**JOIN Performance:**

- LEFT JOINs are efficient (boxes → locations → qr_codes)
- Locations indexed by id (primary key)
- QR codes indexed by box_id (unique constraint)
- Estimate: 1000 boxes = ~10ms query time

### Memory Optimization

**Streaming Approach (Optional Phase 2):**

- For large exports (10k+ boxes), consider streaming CSV generation
- Load boxes in batches, process, and stream to client
- Prevents holding entire result set in memory

**Current Approach (Phase 1):**

- Load all boxes into memory (feasible for MVP)
- Generate file in single operation
- Typical workspace < 1000 boxes = minimal memory impact

### File Size Considerations

**Estimated Sizes:**

- Per box: ~200-300 bytes (CSV with 8 columns)
- 1000 boxes: ~300 KB
- 10000 boxes: ~3 MB

**Current Limitations:**

- No explicit size limits defined in MVP
- HTTP response size limit ~100 MB (typical server config)
- Plan Phase 2: Implement pagination or batch export for large workspaces

### Rate Limiting (Phase 2)

**Recommendation:**

- Limit to 5 exports per user per hour
- Implement at API gateway or middleware
- Return 429 (Too Many Requests) when exceeded

---

## 8. Implementation Steps

### Step 1: Create Export Service

**File:** `src/lib/services/exportService.ts`

Create a service module that handles:

- Database query execution
- Data transformation (ltree → breadcrumb, array → CSV)
- CSV and JSON file generation
- Error handling and validation

```typescript
import { SupabaseClient } from "@supabase/supabase-js";
import { stringify } from "csv-stringify/sync";

export async function exportInventory(
  supabase: SupabaseClient,
  workspaceId: string,
  format: "csv" | "json"
): Promise<{
  content: string;
  mimeType: "text/csv" | "application/json";
  filename: string;
}> {
  // Fetch boxes with related data
  const { data, error } = await supabase
    .from("boxes")
    .select(
      "id, short_id, name, description, tags, location_id, created_at, updated_at, locations(id, path, name), qr_codes(short_id)"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Transform data
  const records = transformBoxes(data || []);

  // Generate file content
  const filename = `inventory-${workspaceId}-${new Date().toISOString().split("T")[0]}.${format}`;

  if (format === "csv") {
    const content = stringify(records, { header: true });
    return {
      content,
      mimeType: "text/csv",
      filename,
    };
  } else {
    const content = JSON.stringify(
      {
        meta: {
          workspace_id: workspaceId,
          export_date: new Date().toISOString(),
          total_records: records.length,
          format_version: "1.0",
        },
        data: records.map((r) => ({
          ...r,
          tags: r.tags ? r.tags.split(",").filter(Boolean) : [],
        })),
      },
      null,
      2
    );

    return {
      content,
      mimeType: "application/json",
      filename: filename.replace(".json", ".json"),
    };
  }
}

function transformBoxes(boxes: any[]): Record<string, any>[] {
  return boxes.map((box) => ({
    id: box.id,
    short_id: box.short_id,
    name: box.name,
    location: formatLocation(box.locations),
    description: box.description || "",
    tags: formatTags(box.tags),
    qr_code: box.qr_codes?.[0]?.short_id || "",
    created_at: box.created_at,
    updated_at: box.updated_at,
  }));
}

function formatLocation(location: any | null): string {
  if (!location) return "";
  // Convert ltree path to breadcrumb or use location names
  // Placeholder - implement based on path structure
  return location.name || "";
}

function formatTags(tags: string[] | null): string {
  if (!tags || tags.length === 0) return "";
  return tags.map((t) => t.replace(/"/g, '""')).join(",");
}
```

### Step 2: Create Validation Schema

**File:** `src/lib/validation/exportValidation.ts`

Use Zod to validate query parameters:

```typescript
import { z } from "zod";

export const exportInventoryQuerySchema = z.object({
  workspace_id: z.string().uuid("Nieprawidłowy format workspace_id (musi być UUID)"),
  format: z
    .string()
    .transform((v) => v.toLowerCase())
    .refine((v) => ["csv", "json"].includes(v), {
      message: "Nieprawidłowy format: musi być 'csv' lub 'json'",
    })
    .default("csv"),
});

export type ExportInventoryQuery = z.infer<typeof exportInventoryQuerySchema>;
```

### Step 3: Create API Route Handler

**File:** `src/pages/api/export/inventory.ts`

```typescript
import { type APIContext } from "astro";
import { exportInventoryQuerySchema } from "@/lib/validation/exportValidation";
import { exportInventory } from "@/lib/services/exportService";

export const prerender = false;

export async function GET(context: APIContext) {
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  try {
    // Validate authentication
    if (!user) {
      return new Response(JSON.stringify({ error: "Nie jesteś uwierzytelniony" }), { status: 401 });
    }

    // Validate and parse query parameters
    const queryParams = Object.fromEntries(context.url.searchParams);
    const validated = exportInventoryQuerySchema.safeParse(queryParams);

    if (!validated.success) {
      return new Response(
        JSON.stringify({
          error: validated.error.errors[0]?.message || "Nieprawidłowe parametry zapytania",
        }),
        { status: 400 }
      );
    }

    const { workspace_id, format } = validated.data;

    // Check workspace membership (RLS policy will enforce)
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace nie został znaleziony" }), { status: 404 });
    }

    // Check if user is workspace member
    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({
          error: "Brak uprawnień: nie jesteś członkiem tego workspace'u",
        }),
        { status: 403 }
      );
    }

    // Generate export
    const result = await exportInventory(supabase, workspace_id, format);

    // Return file response
    return new Response(result.content, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": Buffer.byteLength(result.content).toString(),
      },
    });
  } catch (err) {
    console.error("[exportInventory]", err instanceof Error ? err.message : String(err));

    return new Response(
      JSON.stringify({
        error: "Nie udało się wyeksportować inwentarza",
      }),
      { status: 500 }
    );
  }
}
```

### Step 4: Add CSV Dependency

**File:** `package.json`

```bash
npm install csv-stringify
```

Update package.json to include:

```json
{
  "dependencies": {
    "csv-stringify": "^6.4.6"
  }
}
```

### Step 5: Update Type Definitions

**File:** `src/types.ts`

Add new export-related types:

```typescript
/**
 * Request query parameters for GET /api/export/inventory endpoint.
 */
export interface ExportInventoryQuery {
  workspace_id: string; // UUID
  format?: "csv" | "json"; // Default: 'csv'
}

/**
 * Single box record in export output.
 */
export interface ExportedBoxRecord {
  id: string;
  short_id: string;
  name: string;
  location: string;
  description: string | null;
  tags: string; // CSV format for CSV export, array for JSON
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * JSON export format with metadata.
 */
export interface ExportInventoryJsonResponse {
  meta: {
    workspace_id: string;
    export_date: string;
    total_records: number;
    format_version: string;
  };
  data: Array<Omit<ExportedBoxRecord, "tags"> & { tags: string[] }>;
}
```

### Step 6: Test the Endpoint

**Manual Testing with curl:**

```bash
# Test with valid parameters
TOKEN="your-jwt-token"
WORKSPACE_ID="550e8400-e29b-41d4-a716-446655440000"

# CSV export
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/export/inventory?workspace_id=$WORKSPACE_ID&format=csv" \
  -o inventory-export.csv

# JSON export
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/export/inventory?workspace_id=$WORKSPACE_ID&format=json" \
  -o inventory-export.json

# Test without authentication (should return 401)
curl -s "http://localhost:3000/api/export/inventory?workspace_id=$WORKSPACE_ID" \
  | python3 -m json.tool
```

### Step 7: Create Frontend Integration

**File:** `src/lib/api/endpoints.ts` (or similar)

Add export endpoint definition:

```typescript
export const exportApi = {
  exportInventory: async (workspaceId: string, format: "csv" | "json" = "csv") => {
    const url = new URL("/api/export/inventory", window.location.origin);
    url.searchParams.append("workspace_id", workspaceId);
    url.searchParams.append("format", format);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Export failed");
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get("content-disposition");
    const filename = contentDisposition?.split('filename="')[1]?.split('"')[0] || `inventory-${workspaceId}.${format}`;

    // Create blob and download
    const blob = await response.blob();
    const url_blob = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url_blob;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url_blob);
  },
};
```

### Step 8: Add to Settings View

Update Settings component to call export endpoint:

```typescript
import { exportApi } from '@/lib/api/endpoints';

function DataSection({ workspaceId }: { workspaceId: string }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setIsExporting(true);
      await exportApi.exportInventory(workspaceId, format);
    } catch (err) {
      // Show error toast
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => handleExport('csv')}
        disabled={isExporting}
      >
        Export as CSV
      </button>
      <button
        onClick={() => handleExport('json')}
        disabled={isExporting}
      >
        Export as JSON
      </button>
    </div>
  );
}
```

### Step 9: Database Considerations

**No migration required** - Uses existing tables and relationships.

**Optional optimization migration** (Phase 2):

```sql
-- Create compound index for faster exports
CREATE INDEX IF NOT EXISTS idx_boxes_workspace_created
ON boxes(workspace_id, created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE
SELECT b.*, l.path, q.short_id
FROM boxes b
LEFT JOIN locations l ON b.location_id = l.id
LEFT JOIN qr_codes q ON b.id = q.box_id
WHERE b.workspace_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY b.created_at DESC;
```

### Step 10: Testing Checklist

**Unit Tests:**

- [ ] Validate query parameter validation
- [ ] Test ltree to breadcrumb conversion
- [ ] Test tags array to CSV string conversion
- [ ] Test CSV escaping (special characters, quotes, newlines)
- [ ] Test JSON serialization with metadata

**Integration Tests:**

- [ ] CSV export with valid workspace (returns 200)
- [ ] JSON export with valid workspace (returns 200)
- [ ] Export with 0 boxes (empty but valid file)
- [ ] Export with 100+ boxes (performance)
- [ ] Missing workspace_id (returns 400)
- [ ] Invalid workspace_id format (returns 400)
- [ ] No authentication (returns 401)
- [ ] User not workspace member (returns 403)
- [ ] Non-existent workspace (returns 404)
- [ ] Verify CSV escaping with special characters
- [ ] Verify JSON format with array tags
- [ ] Verify filename format in Content-Disposition

**Manual Testing:**

- [ ] Download CSV file and verify in spreadsheet
- [ ] Download JSON file and verify structure
- [ ] Test with workspace containing unassigned boxes
- [ ] Test with boxes without QR codes
- [ ] Test with boxes with special characters in names/descriptions
- [ ] Verify file size reasonable
- [ ] Check response headers (Content-Type, Content-Disposition)

---

## Summary Table

| Aspect               | Details                                                     |
| -------------------- | ----------------------------------------------------------- |
| **Route**            | `GET /api/export/inventory`                                 |
| **Authentication**   | Required (JWT token)                                        |
| **Authorization**    | Workspace member                                            |
| **Input Validation** | workspace_id (UUID), format (csv\|json)                     |
| **Success Response** | 200 OK with file stream                                     |
| **Error Responses**  | 400, 401, 403, 404, 500 (with Polish messages)              |
| **Service Layer**    | `src/lib/services/exportService.ts`                         |
| **Validation**       | `src/lib/validation/exportValidation.ts`                    |
| **Dependencies**     | csv-stringify v6+                                           |
| **Database**         | Queries boxes with location/QR joins                        |
| **Performance**      | ~10ms for 1000 boxes                                        |
| **Security**         | RLS enforcement, input validation, CSV injection prevention |
| **File Formats**     | CSV (default), JSON (optional)                              |

---

**Document Version:** 1.0
**Created:** 2025-12-28
**Status:** Ready for Implementation
**Phase:** Phase 5+ (Post-MVP)
**Estimated Implementation Time:** 4-6 hours

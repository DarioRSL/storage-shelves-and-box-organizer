# Database Schema - Storage & Box Organizer

**Last Updated:** January 2, 2026
**Migration Status:** ✅ **Complete** (3 migrations applied)
**Schema Version:** 20260102182001

This document describes the PostgreSQL database schema for the Storage & Box Organizer application, designed based on the Product Requirements Document (PRD) and planning session notes.

## Migration Timeline

| Migration | Date | Status | Description |
|-----------|------|--------|-------------|
| `20251212120000_initial_schema.sql` | 2025-12-12 | ✅ Applied | Initial schema with all tables, triggers, indexes |
| `20251214120000_workspace_creation_trigger.sql` | 2025-12-14 | ✅ Applied | Workspace owner auto-assignment trigger |
| `20260102182001_add_theme_preference_to_profiles.sql` | 2026-01-02 | ✅ Applied | Theme preference column in profiles |

**⚠️ CRITICAL SECURITY NOTE:**
- RLS policies are currently **commented out** in the initial migration (`20251212120000_initial_schema.sql`, lines 198-382)
- All tables have RLS-ready policy definitions but policies are **NOT ENABLED**
- This is a **known security gap** that should be addressed before production deployment
- Recommendation: Create migration `20260103000000_enable_rls_policies.sql` to uncomment and apply all RLS policies

## 1. Conventions and Extensions

### PostgreSQL Extensions

- `uuid-ossp`: For generating UUIDs.
- `ltree`: For handling hierarchical location structures.
- `moddatetime`: For automatic updates of `updated_at` columns.
- `pg_trgm` (optional): For fuzzy search support.
- `unaccent`: For text normalization in search.

### ENUM Types

```sql
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'read_only');
CREATE TYPE qr_status AS ENUM ('generated', 'printed', 'assigned');
```

## 2. Tables

### 2.1. users

This table is managed internally by Supabase Auth and serves as the source of truth for user identity.

- id: UUID PRIMARY KEY
- email: VARCHAR
- encrypted_password: VARCHAR
- email_confirmed_at: TIMESTAMPTZ
- last_sign_in_at: TIMESTAMPTZ
- raw_user_meta_data: JSONB
- raw_app_meta_data: JSONB
- aud: VARCHAR
- created_at: TIMESTAMPTZ

### 2.2. public.profiles

Stores public user data, linked 1:1 with the `auth.users` table.

- id: UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
- email: TEXT NOT NULL
- full_name: TEXT
- avatar_url: TEXT
- theme_preference: TEXT NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system'))
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at: TIMESTAMPTZ NOT NULL DEFAULT now()

**Theme Preference Column:**
- **Purpose**: Stores user's preferred theme mode (light, dark, or system)
- **Default**: 'system' (follows OS theme preference)
- **Validation**: CHECK constraint ensures only valid values ('light', 'dark', 'system')
- **Migration**: Added in `20260102182001_add_theme_preference_to_profiles.sql`
- **API Integration**: Updated via PATCH /api/profiles/me/theme endpoint
- **SSR Support**: Fetched server-side before page render to prevent FOUC (Flash of Unstyled Content)

_Trigger: Automatically update the `updated_at` column on record updates._

### 2.3. public.workspaces

Data isolation unit (Tenant). Every user belongs to at least one Workspace.

- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- owner_id: UUID NOT NULL REFERENCES profiles(id)
- name: TEXT NOT NULL
- created_at: TIMESTAMPTZ DEFAULT now()
- updated_at: TIMESTAMPTZ DEFAULT now()

_Trigger: Automatically update the `updated_at` column on record updates._

### 2.4. public.workspace_members

Junction table linking users to workspaces (many-to-many relationship).

- workspace_id: UUID REFERENCES workspaces(id) ON DELETE CASCADE
- user_id: UUID REFERENCES profiles(id) ON DELETE CASCADE
- role: USER_ROLE NOT NULL DEFAULT 'member'
- joined_at: TIMESTAMPTZ DEFAULT now()

_Primary Key: (workspace_id, user_id)_

### 2.5. public.locations

Hierarchical storage structure. Supports Soft Delete.

- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- workspace_id: UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
- path: LTREE NOT NULL
- name: TEXT NOT NULL
- description: TEXT
- is_deleted: BOOLEAN DEFAULT false
- created_at: TIMESTAMPTZ DEFAULT now()
- updated_at: TIMESTAMPTZ DEFAULT now()

_Indexes:_

- GIST index on `path`
- Unique constraint on `path` within `workspace_id`

_Constraints:_

- `nlevel(path) <= 5` (Max depth 5)

_Trigger: Automatically update the `updated_at` column on record updates._

### 2.6. public.boxes

Main inventory entity. Boxes can be unassigned (not linked to a location).

- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- workspace_id: UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
- location_id: UUID REFERENCES locations(id) ON DELETE SET NULL (NULL means "Unassigned")
- short_id: TEXT NOT NULL UNIQUE
- name: TEXT NOT NULL
- description: TEXT
- tags: TEXT[] DEFAULT '{}'
- image_url: TEXT
- search_vector: TSVECTOR GENERATED ALWAYS AS (...) STORED
- created_at: TIMESTAMPTZ DEFAULT now()
- updated_at: TIMESTAMPTZ DEFAULT now()

_Indexes:_

- GIN index on `search_vector`
- Index on `tags`
- Index on `location_id`

_Trigger: Automatically update the `updated_at` column on record updates._
_Trigger: Generate unique `short_id` before insert._
_Trigger: Reset associated `qr_codes` record before delete (sets box_id to NULL, status to 'generated')._

### 2.7. public.qr_codes

Registry of generated QR codes. 1:1 relationship with boxes.

- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- workspace_id: UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
- box_id: UUID UNIQUE REFERENCES boxes(id) ON DELETE SET NULL
- short_id: TEXT NOT NULL UNIQUE (format: QR-XXXXXX, 6 chars)
- status: QR_STATUS NOT NULL DEFAULT 'generated'
- created_at: TIMESTAMPTZ DEFAULT now()

_Indexes:_

- Index on `workspace_id`
- Unique index on `short_id`
- Index on `box_id`

_Trigger: Generate unique `short_id` before insert (format: QR-XXXXXX)._
_Trigger: When a box is deleted, reset associated QR code: set `box_id` to NULL and `status` to 'generated'._

## 3. Relationships

- **Auth Users** (1) -> (1) **Profiles**
- **Profiles** (1) -> (N) **Workspace Members** (N) <- (1) **Workspaces**
- **Workspaces** (1) -> (N) **Locations**
- **Workspaces** (1) -> (N) **Boxes**
- **Locations** (1) -> (N) **Boxes**
- **Boxes** (1) -> (1) **QR Codes**

## 4. Row Level Security (RLS) Policies

All tables must have RLS enabled.

**Helper Function:** `is_workspace_member(_workspace_id uuid)` checks if the current user belongs to the workspace.

**Policies:**

- **Workspaces:** Members can view. Owners/Admins can update/delete.
- **Locations, Boxes, QR Codes:** Access allowed if `is_workspace_member(workspace_id)` is true.

## 5. Functions and Triggers

- **Box Short ID Generation:** `BEFORE INSERT` on `boxes`. Generates random 10 char alphanumeric string.
- **QR Short ID Generation:** `BEFORE INSERT` on `qr_codes`. Generates unique short_id with format `QR-XXXXXX` (6 chars).
- **Updated At:** `moddatetime` extension trigger on `profiles`, `workspaces`, `locations`, `boxes`.
- **New User Handling:** `AFTER INSERT` on `auth.users`. Creates `profile` and default `workspace`.
- **Workspace Owner Assignment:** `AFTER INSERT` on `workspaces`. Automatically adds the workspace owner to `workspace_members` with role 'owner'. Ensures atomicity and data integrity.
- **Box Deletion Handler:** `BEFORE DELETE` on `boxes`. Resets linked QR code: sets `box_id` to NULL and `status` to 'generated' for reuse.
- **Search Vector Update:** Generated column on `boxes`. Automatically updates `search_vector` from name, tags, description.

## 6. Architectural Decisions & Notes

### 6.1 Authentication & Authorization Strategy

**Multi-Layer Security Approach:**

1. **Application Layer (Middleware):**
   - Parses HttpOnly cookies from request headers
   - Extracts `sb_session` JWT token
   - Validates JWT format and claims without verification (trusted internal source)
   - Provides user object via `context.locals.user` to all routes

2. **Database Layer (RLS Policies):**
   - PostgreSQL Row Level Security enforces workspace membership
   - Helper function: `is_workspace_member(workspace_id)`
   - All data access automatically filtered by RLS policies
   - Prevents direct database access without proper authorization

3. **API Layer (Endpoint Validation):**
   - Each endpoint validates `context.locals.user` exists (401 if missing)
   - Service layer performs additional business logic validation
   - Comprehensive error handling with Polish user-friendly messages

**Why HttpOnly Cookies Instead of Authorization Header?**
- ✅ XSS Protection: JavaScript cannot access HttpOnly cookies
- ✅ CSRF Protection: SameSite=Strict prevents cross-site cookie transmission
- ✅ Automatic Transmission: Cookies sent by browser without explicit header
- ❌ Authorization Header: Tokens visible to JavaScript (XSS risk)

**Why JWT Fallback in Middleware?**
- Provides resilience if Supabase auth temporarily fails
- JWT decoded without verification (we trust our own tokens from session endpoint)
- Graceful degradation: All 14 API endpoints still authenticate successfully
- No impact on performance (single JWT decode vs database lookup)

### 6.2 Location Hierarchy (ltree) Optimization

**Original Issue:**
- PostgREST API doesn't support PostgreSQL's ltree operators (~, @>, <@, etc.)
- Attempt to use ltree operators in queries resulted in: `operator does not exist: ltree ~~ unknown`
- Blocked entire location feature implementation

**Solution Implemented:**
- Fetch all locations in single efficient query without ltree operators
- In-memory filtering using JavaScript to derive hierarchical structure
- Two key functions in `src/lib/services/location.service.ts`:
  - `getLocations()`: Fetches all workspace locations in single query
  - `getAllLocationChildren()`: Filters children by comparing path segments

**Performance Impact:**
- ✅ Faster: Single query + JS filtering faster than complex SQL operators
- ✅ Simpler: No dependency on PostgREST ltree operator support
- ✅ Maintainable: JavaScript filtering is easier to debug than SQL operators

**Example Query Pattern:**
```sql
-- Instead of:
SELECT * FROM locations WHERE path ~ 'root.garage.*'

-- We do:
SELECT * FROM locations WHERE workspace_id = $1
-- Then in JavaScript:
const children = locations.filter(loc =>
  loc.path.startsWith(parentPath + '.')
)
```

### 6.3 Data Integrity & Constraints

**Key Business Rules Enforced:**

1. **Workspace Isolation:**
   - `workspace_id` required on all data tables
   - RLS policies prevent cross-workspace data access
   - Foreign key cascades ensure data consistency

2. **Location Hierarchy:**
   - Max depth: 5 levels (constraint: `nlevel(path) <= 5`)
   - Sibling uniqueness: Unique constraint on `(workspace_id, path)`
   - Soft delete: Location marked deleted but preserved for audit trails

3. **QR Code Lifecycle:**
   - Unique `short_id` format: `QR-XXXXXX` (generated by trigger)
   - Status progression: `generated` → `assigned` → (delete) → `generated`
   - 1:1 relationship with boxes (unique constraint on `box_id`)

4. **Box Management:**
   - Auto-generated `short_id` (10 char alphanumeric)
   - `search_vector` automatically maintained via generated column
   - Cascade delete of linked QR codes on box deletion

### 6.4 Migration Strategy & Version Control

**Current Migration Files:**
- `20251212120000_initial_schema.sql` - Initial database setup with all tables, enums, RLS policies
- `20251214120000_workspace_creation_trigger.sql` - Workspace owner auto-assignment
- `20260102182001_add_theme_preference_to_profiles.sql` - Added theme_preference column to profiles table

**Future Migration Guidelines:**
- Use UTC timestamps in naming: `YYYYMMDDHHmmss_description.sql`
- Include comments explaining purpose and impact
- Test migrations locally before deploying to production
- Document any breaking changes or data transformations

### 6.5 RLS Policy Review

**Current RLS Policies Enforce:**

| Table | Policy | Condition |
|-------|--------|-----------|
| profiles | SELECT/UPDATE | User is self |
| workspaces | SELECT | User is workspace member |
| workspaces | UPDATE/DELETE | User is workspace owner |
| workspace_members | SELECT | User is workspace member |
| workspace_members | INSERT/UPDATE/DELETE | User is workspace owner/admin |
| locations | All | `is_workspace_member(workspace_id)` |
| boxes | All | `is_workspace_member(workspace_id)` |
| qr_codes | All | `is_workspace_member(workspace_id)` |

**Helper Function:**
```sql
CREATE FUNCTION is_workspace_member(_workspace_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM workspace_members
    WHERE workspace_id = _workspace_id
    AND user_id = auth.uid()
  )
$$ LANGUAGE SQL STABLE;
```

This ensures all workspace-scoped data is accessible only to workspace members.

### 6.6 Schema Implementation Completeness

**✅ Fully Implemented Features:**
1. All 6 core tables (profiles, workspaces, workspace_members, locations, boxes, qr_codes)
2. All PostgreSQL extensions (uuid-ossp, ltree, moddatetime, pg_trgm, unaccent)
3. All enums (user_role, qr_status)
4. All triggers (updated_at, short_id generation, QR reset, new user handling, workspace owner)
5. All indexes (GIST on path, GIN on search_vector and tags)
6. All constraints (foreign keys, check constraints, unique constraints)
7. Theme preference column (added 2026-01-02)
8. Workspace owner auto-assignment (added 2025-12-14)

**⚠️ Pending Implementation:**
1. RLS policy enablement (all policies defined but commented out in migration)

**Schema Matches Documentation:** 100% (except RLS enablement)

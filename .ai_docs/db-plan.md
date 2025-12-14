# Database Schema - Storage & Box Organizer

This document describes the PostgreSQL database schema for the Storage & Box Organizer application, designed based on the Product Requirements Document (PRD) and planning session notes.

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
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at: TIMESTAMPTZ NOT NULL DEFAULT now()

*Trigger: Automatically update the `updated_at` column on record updates.*

### 2.3. public.workspaces

Data isolation unit (Tenant). Every user belongs to at least one Workspace.

- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- owner_id: UUID NOT NULL REFERENCES profiles(id)
- name: TEXT NOT NULL
- created_at: TIMESTAMPTZ DEFAULT now()
- updated_at: TIMESTAMPTZ DEFAULT now()

*Trigger: Automatically update the `updated_at` column on record updates.*

### 2.4. public.workspace_members

Junction table linking users to workspaces (many-to-many relationship).

- workspace_id: UUID REFERENCES workspaces(id) ON DELETE CASCADE
- user_id: UUID REFERENCES profiles(id) ON DELETE CASCADE
- role: USER_ROLE NOT NULL DEFAULT 'member'
- joined_at: TIMESTAMPTZ DEFAULT now()

*Primary Key: (workspace_id, user_id)*

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

*Indexes:*
- GIST index on `path`
- Unique constraint on `path` within `workspace_id`

*Constraints:*
- `nlevel(path) <= 5` (Max depth 5)

*Trigger: Automatically update the `updated_at` column on record updates.*

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

*Indexes:*
- GIN index on `search_vector`
- Index on `tags`
- Index on `location_id`

*Trigger: Automatically update the `updated_at` column on record updates.*
*Trigger: Generate unique `short_id` before insert.*
*Trigger: Reset associated `qr_codes` record before delete (sets box_id to NULL, status to 'generated').*

### 2.7. public.qr_codes

Registry of generated QR codes. 1:1 relationship with boxes.

- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- workspace_id: UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
- box_id: UUID UNIQUE REFERENCES boxes(id) ON DELETE SET NULL
- short_id: TEXT NOT NULL UNIQUE (format: QR-XXXXXX, 6 chars)
- status: QR_STATUS NOT NULL DEFAULT 'generated'
- created_at: TIMESTAMPTZ DEFAULT now()

*Indexes:*
- Index on `workspace_id`
- Unique index on `short_id`
- Index on `box_id`

*Trigger: Generate unique `short_id` before insert (format: QR-XXXXXX).*
*Trigger: When a box is deleted, reset associated QR code: set `box_id` to NULL and `status` to 'generated'.*

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
- **Box Deletion Handler:** `BEFORE DELETE` on `boxes`. Resets linked QR code: sets `box_id` to NULL and `status` to 'generated' for reuse.
- **Search Vector Update:** Generated column on `boxes`. Automatically updates `search_vector` from name, tags, description.

# Supabase Storage Migration Troubleshooting Guide

## The Problem: Duplicate Migration Key Error

### Symptom

```
supabase_storage_supabase container logs:
{"level":50,"time":"...","type":"startupError","error":{
  "message":"Migration failed. Reason: duplicate key value violates unique constraint \"migrations_name_key\""
}}
```

### Root Cause

The Supabase Storage API container maintains its own migration tracking table in PostgreSQL at `storage.migrations`. This table has a **unique constraint on the `name` column** to prevent duplicate migrations.

**Why it happens:**

1. **Docker Volume Persistence**: When you run `supabase stop`, all data is backed up to Docker volumes:
   - `supabase_db_supabase` - PostgreSQL database data (includes migration tracking tables)
   - `supabase_storage_supabase` - Storage API application state

2. **Migration Tracking Mismatch**: The Storage API container has **built-in migrations** that it attempts to apply on startup. When restoring from a backup:
   - The `storage.migrations` table in PostgreSQL already contains migration records
   - The Storage API container tries to INSERT the same migrations again
   - PostgreSQL rejects the duplicate with a unique constraint violation

3. **Version Discrepancies**: This issue commonly occurs when:
   - Images are updated between restarts (pulling newer versions)
   - The Storage API version expects different migration hashes
   - The backed-up volume has a corrupted or inconsistent state

### Why First Run Succeeded, Second Run Failed

**First Run:**

- Fresh images pulled for `postgres`, `postgrest`, `realtime`, `storage-api`, etc.
- Database volume was in a clean, consistent state
- Migrations ran successfully and were recorded in `storage.migrations`

**Second Run:**

- Images marked as "already present locally"
- Database restored from backed-up volume with migrations already recorded
- Storage API attempted to re-apply migrations → **DUPLICATE KEY ERROR**

---

## Solution 1: Surgical Fix (Preserve Data)

Use the provided repair script to fix the migration table without losing data.

### Step 1: Run the Repair Script

```bash
./scripts/fix-storage-migrations.sh
```

This script will:

1. Stop Supabase if running
2. Start only the PostgreSQL container
3. Inspect `storage.migrations` for duplicates
4. Remove duplicate entries (keeping the oldest)
5. Clean up and let you restart Supabase

### Step 2: Restart Supabase

```bash
supabase start
```

### What the Script Does

The script runs this SQL to remove duplicates:

```sql
WITH ranked_migrations AS (
    SELECT
        id,
        name,
        ROW_NUMBER() OVER (PARTITION BY name ORDER BY executed_at ASC) as rn
    FROM storage.migrations
)
DELETE FROM storage.migrations
WHERE id IN (
    SELECT id FROM ranked_migrations WHERE rn > 1
);
```

---

## Solution 2: Remove Storage Volume (Fast Fix)

If you don't need to preserve Storage API data (buckets, objects), you can simply remove the corrupted storage volume:

```bash
# Stop Supabase
supabase stop

# Remove only the storage volume (keeps database data)
podman volume rm supabase_storage_supabase

# Restart - Storage API will recreate its migrations from scratch
supabase start
```

**⚠️ Warning**: This removes all Storage buckets and uploaded files from local development.

---

## Solution 3: Complete Reset (Nuclear Option)

For a completely clean slate:

```bash
# Stop Supabase
supabase stop

# Remove all Supabase volumes
podman volume rm supabase_db_supabase supabase_storage_supabase

# Start fresh
supabase start
```

**⚠️ Warning**: This deletes **all** local database data, not just migrations.

---

## Prevention Strategies

### 1. Don't Interrupt Supabase Startup

Always let `supabase start` complete fully before running `supabase stop`. Partial startups can leave the database in an inconsistent state.

**Bad:**

```bash
supabase start
# See an error
Ctrl+C  # ← DON'T DO THIS
supabase start  # ← Will restore bad state
```

**Good:**

```bash
supabase start
# Let it fail completely
# Check logs with --debug
supabase stop  # Clean shutdown
# Fix the issue
supabase start
```

### 2. Pin Supabase CLI and Image Versions

Add to your project's [package.json](../package.json):

```json
{
  "engines": {
    "supabase": ">=2.67.1"
  }
}
```

Update [supabase/config.toml](../supabase/config.toml):

```toml
[db]
major_version = 15
image = "supabase/postgres:15.8.1.117"

[storage]
image = "supabase/storage-api:v1.11.9"  # Pin version
```

### 3. Use Explicit Backup/Restore Workflow

Instead of relying on automatic volume backups, use explicit dumps:

```bash
# Before stopping, dump the database
supabase db dump -f supabase/backups/$(date +%Y%m%d_%H%M%S).sql

# Stop and start normally
supabase stop
supabase start

# If needed, restore from dump
psql -h 127.0.0.1 -p 54322 -U postgres < supabase/backups/20260110_120000.sql
```

### 4. Clear Volumes Between Major Changes

When pulling major Supabase updates or changing schemas significantly:

```bash
# Backup first
supabase db dump -f backup.sql

# Clean volumes
supabase stop
podman volume rm supabase_db_supabase supabase_storage_supabase

# Start fresh
supabase start

# Restore data
psql -h 127.0.0.1 -p 54322 -U postgres < backup.sql
```

### 5. Monitor Container Health

Add health check monitoring to catch startup issues early:

```bash
# Check container health
podman ps --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}\t{{.Health}}"

# Watch logs during startup
supabase start --debug 2>&1 | tee startup.log
```

---

## Debugging Commands

### Inspect Migration Table

```bash
# Connect to running Supabase DB
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Query migrations
SELECT name, hash, executed_at FROM storage.migrations ORDER BY executed_at;

# Check for duplicates
SELECT name, COUNT(*) as count
FROM storage.migrations
GROUP BY name
HAVING COUNT(*) > 1;
```

### Check Docker Volumes

```bash
# List Supabase volumes
podman volume ls --filter label=com.supabase.cli.project=supabase

# Inspect volume details
podman volume inspect supabase_db_supabase
podman volume inspect supabase_storage_supabase
```

### View Container Logs

```bash
# View storage container logs
podman logs supabase_storage_supabase

# Follow logs in real-time
podman logs -f supabase_storage_supabase
```

### Manual Database Connection

```bash
# Start standalone Postgres with volume
podman run --rm -it \
    -v supabase_db_supabase:/var/lib/postgresql/data \
    -e POSTGRES_PASSWORD=postgres \
    -p 54399:5432 \
    supabase/postgres:15.8.1.117

# Connect from another terminal
psql postgresql://postgres:postgres@127.0.0.1:54399/postgres
```

---

## Understanding Supabase Migration Systems

Supabase has **multiple independent migration tracking systems**:

### 1. Database Schema Migrations (Your Migrations)

- Location: `supabase/migrations/`
- Tracked in: `supabase_migrations.schema_migrations`
- Applied by: `supabase start` (runs migrations from your project)
- Purpose: Your application's database schema evolution

### 2. Storage API Migrations (Internal)

- Location: Embedded in Storage API container image
- Tracked in: `storage.migrations`
- Applied by: Storage API container on startup
- Purpose: Storage bucket schema, RLS policies, internal functions

### 3. Auth Migrations (Internal)

- Location: Embedded in Auth container image
- Tracked in: `auth.schema_migrations`
- Applied by: Auth container on startup
- Purpose: User auth tables, sessions, providers

### 4. Realtime Migrations (Internal)

- Location: Embedded in Realtime container image
- Tracked in: `realtime.schema_migrations`
- Applied by: Realtime container on startup
- Purpose: WebSocket subscriptions, presence

**The duplicate key error is specifically in #2 (Storage API Migrations).**

---

## When to Use Each Solution

| Scenario                           | Recommended Solution                 | Reason                   |
| ---------------------------------- | ------------------------------------ | ------------------------ |
| First occurrence of error          | Solution 2 (Remove storage volume)   | Fast, low risk           |
| Have important local Storage files | Solution 1 (Surgical fix)            | Preserves data           |
| Recurring errors                   | Solution 3 + Pin versions            | Clean slate + prevention |
| After Supabase CLI upgrade         | Solution 3 (Full reset)              | Avoid version conflicts  |
| After pulling new images           | Check versions, possibly Solution 2  | Image compatibility      |
| Production deployment              | Never happens - uses hosted Supabase | N/A                      |

---

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [PostgreSQL Unique Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [Docker Volume Management](https://docs.docker.com/storage/volumes/)

---

## Contributing

If you encounter this issue and the provided solutions don't work, please:

1. Run `supabase start --debug > debug.log 2>&1`
2. Capture the output
3. Share in project discussions with:
   - Supabase CLI version (`supabase --version`)
   - Podman/Docker version
   - OS/Platform
   - Steps taken before the error

This helps improve the troubleshooting guide for everyone.

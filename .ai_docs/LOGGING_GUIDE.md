# Logging Guide - Winston Implementation

## Overview

This application uses **Winston** for professional server-side logging with structured logs, daily rotation, and configurable levels. This guide covers usage patterns, best practices, and troubleshooting.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Log Levels](#log-levels)
3. [Usage Patterns](#usage-patterns)
4. [Configuration](#configuration)
5. [Log Files](#log-files)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Import the Logger

```typescript
import { log } from "@/lib/services/logger";
```

### Basic Usage

```typescript
// Info log
log.info("User logged in successfully", {
  userId: user.id,
  timestamp: Date.now()
});

// Error log
log.error("Failed to create box", {
  error: error.message,
  userId: user.id,
  workspaceId: workspace.id
});

// Warning log
log.warn("QR code assignment failed", {
  qrCodeId: qrCode.id,
  reason: "Already assigned"
});

// Debug log (only in development)
log.debug("Cache hit", {
  key: cacheKey,
  ttl: 3600
});
```

---

## Log Levels

Winston supports 6 log levels (RFC 5424):

| Level | When to Use | Example Use Cases |
|-------|-------------|-------------------|
| **error** | Errors that require attention | Database failures, API errors, unhandled exceptions |
| **warn** | Potential issues or unusual events | Deprecated feature usage, authorization failures, rate limits |
| **info** | Important business events | User login/logout, resource creation/deletion, payment processing |
| **http** | HTTP request/response logging | API endpoint calls (currently unused) |
| **verbose** | Detailed operational information | (Currently unused) |
| **debug** | Development/debugging information | Cache operations, function entry/exit, detailed state |

### Current Configuration

- **Production** (`NODE_ENV=production`): `info` level (errors, warnings, info)
- **Development** (default): `debug` level (all logs)

Change log level via environment variable:

```bash
LOG_LEVEL=warn npm run dev    # Only warnings and errors
LOG_LEVEL=debug npm run build # All logs in production build
```

---

## Usage Patterns

### Service Layer Pattern

```typescript
// src/lib/services/box.service.ts

export async function createBox(
  supabase: SupabaseClient,
  request: CreateBoxRequest
): Promise<CreateBoxResponse> {
  try {
    // Log start (optional for complex operations)
    log.debug("Creating box", { workspaceId: request.workspace_id });

    const { data: box, error: boxError } = await supabase
      .from("boxes")
      .insert(request)
      .single();

    if (boxError) {
      // Log error with context
      log.error("Failed to create box", {
        error: boxError.message,
        code: boxError.code,
        workspaceId: request.workspace_id,
        qrCodeId: request.qr_code_id
      });
      throw new Error("Nie udało się utworzyć pudełka");
    }

    // Log success
    log.info("Box created successfully", {
      boxId: box.id,
      workspaceId: box.workspace_id,
      qrAssigned: !!request.qr_code_id
    });

    return box;
  } catch (error) {
    // Log unexpected errors
    log.error("Unexpected error in createBox", {
      error: error instanceof Error ? error.message : String(error),
      workspaceId: request.workspace_id
    });
    throw error;
  }
}
```

### API Endpoint Pattern

```typescript
// src/pages/api/boxes.ts

export const POST: APIRoute = async ({ locals, request }) => {
  try {
    const user = locals.user;
    if (!user) {
      log.warn("Unauthorized API access attempt", {
        endpoint: "POST /api/boxes"
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401
      });
    }

    const body = await request.json();
    const box = await createBox(locals.supabase, body);

    return new Response(JSON.stringify(box), { status: 201 });
  } catch (error) {
    // Log API-level errors
    log.error("API endpoint error", {
      endpoint: "POST /api/boxes",
      error: error instanceof Error ? error.message : String(error)
    });

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
};
```

### Middleware Pattern

```typescript
// src/middleware/index.ts

export const onRequest = async (context, next) => {
  const requestId = crypto.randomUUID();

  log.info("HTTP request received", {
    requestId,
    method: context.request.method,
    url: context.url.pathname,
    userAgent: context.request.headers.get("user-agent")
  });

  const startTime = Date.now();

  try {
    const response = await next();

    log.info("HTTP request completed", {
      requestId,
      duration: Date.now() - startTime,
      status: response.status
    });

    return response;
  } catch (error) {
    log.error("Middleware error", {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};
```

---

## Configuration

### Environment Variables

Create or update `.env`:

```bash
# Log level: error | warn | info | debug (default: info in prod, debug in dev)
LOG_LEVEL=info

# Node environment (affects log level default)
NODE_ENV=production
```

### Winston Configuration

Location: `src/lib/services/logger.ts`

**Current Settings**:
- **Format**: JSON (structured logs)
- **Rotation**: Daily (new file per day)
- **Retention**: 14 days
- **Max Size**: 20MB per file
- **Compression**: Yes (gzip old logs)

**Transports**:
1. **Console**: Colorized, timestamp, level, message
2. **Combined File**: All logs → `logs/combined-YYYY-MM-DD.log`
3. **Error File**: Errors only → `logs/error-YYYY-MM-DD.log`

### Customizing Configuration

```typescript
// src/lib/services/logger.ts

const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Add custom transport (e.g., external logging service)
    new winston.transports.Http({
      host: 'logs.example.com',
      port: 443,
      path: '/logs',
      ssl: true
    })
  ]
});
```

---

## Log Files

### Directory Structure

```
logs/
├── combined-2026-01-05.log          # All logs for Jan 5
├── combined-2026-01-04.log          # All logs for Jan 4
├── error-2026-01-05.log             # Errors only for Jan 5
├── error-2026-01-04.log             # Errors only for Jan 4
├── .audit-hash1.json                # Winston rotation metadata
└── .audit-hash2.json                # Winston rotation metadata
```

### Log Format

**Console Output** (Development):
```
2026-01-05 13:26:45 [info]: Box created successfully { boxId: "abc-123", workspaceId: "ws-456" }
```

**File Output** (JSON):
```json
{
  "timestamp": "2026-01-05T13:26:45.123Z",
  "level": "info",
  "message": "Box created successfully",
  "boxId": "abc-123",
  "workspaceId": "ws-456"
}
```

### Viewing Logs

**Real-time monitoring**:
```bash
# Watch all logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# Watch errors only
tail -f logs/error-$(date +%Y-%m-%d).log

# Filter by keyword
tail -f logs/combined-*.log | grep "userId"
```

**Search logs**:
```bash
# Find errors related to specific user
grep "userId.*user-123" logs/combined-*.log

# Count log entries by level
grep -oh '"level":"[^"]*"' logs/combined-*.log | sort | uniq -c
```

**JSON parsing** (using `jq`):
```bash
# Pretty print last 10 logs
tail -10 logs/combined-$(date +%Y-%m-%d).log | jq '.'

# Filter by level
cat logs/combined-*.log | jq 'select(.level == "error")'

# Extract specific fields
cat logs/combined-*.log | jq '{timestamp, message, userId}'
```

---

## Best Practices

### 1. Use Structured Logging

**❌ Bad** (string concatenation):
```typescript
log.error(`Failed to create box for user ${userId} in workspace ${workspaceId}: ${error}`);
```

**✅ Good** (structured metadata):
```typescript
log.error("Failed to create box", {
  userId,
  workspaceId,
  error: error.message,
  code: error.code
});
```

### 2. Use Consistent Field Names

**Standard Fields**:
- `userId` (not `user_id`, `user`, `uid`)
- `workspaceId` (not `workspace_id`, `wsId`)
- `boxId`, `locationId`, `qrCodeId`
- `error` (error message string)
- `code` (error code from Supabase)
- `endpoint` (for API routes: `"GET /api/boxes"`)

### 3. Never Log Sensitive Data

**❌ Never log**:
- Passwords or password hashes
- JWT tokens (full tokens)
- Email addresses (use userId instead)
- Credit card numbers
- Personal Identifiable Information (PII)

**✅ Safe to log**:
- User IDs (UUIDs)
- Resource IDs
- Error codes
- Timestamps
- Request metadata (method, endpoint)

### 4. Choose Appropriate Log Levels

```typescript
// ❌ Bad: Using wrong level
log.error("User logged in");           // Not an error!
log.debug("Database connection failed"); // Should be error!

// ✅ Good: Correct level
log.info("User logged in", { userId });
log.error("Database connection failed", { error: err.message });
log.warn("QR code already assigned", { qrCodeId });
log.debug("Cache hit", { key: cacheKey });
```

### 5. Include Context in Errors

```typescript
// ❌ Bad: No context
log.error("Failed to create box");

// ✅ Good: With context
log.error("Failed to create box", {
  error: boxError.message,
  code: boxError.code,
  workspaceId: request.workspace_id,
  qrCodeId: request.qr_code_id,
  userId: user.id
});
```

### 6. Use Error instanceof Pattern

```typescript
// ✅ Correct pattern
try {
  // ... operation
} catch (error) {
  log.error("Operation failed", {
    error: error instanceof Error ? error.message : String(error)
  });
}
```

### 7. Log Business Events

```typescript
// Important business events should be logged
log.info("User account created", { userId, email: hash(email) });
log.info("Payment processed", { userId, amount, currency });
log.info("Export generated", { userId, format: "csv", recordCount });
```

---

## Troubleshooting

### Issue: Logs not appearing

**Symptoms**: No log files created, no console output

**Solutions**:
1. Check `LOG_LEVEL` environment variable
   ```bash
   echo $LOG_LEVEL  # Should be: error, warn, info, or debug
   ```

2. Verify logger import
   ```typescript
   import { log } from "@/lib/services/logger";  // ✅ Correct
   import { logger } from "./logger";             // ❌ Wrong export
   ```

3. Check logs directory permissions
   ```bash
   ls -la logs/
   # Should be writable by current user
   ```

### Issue: Log files too large

**Symptoms**: Disk space issues, slow log searches

**Solutions**:
1. Reduce retention period (default: 14 days)
   ```typescript
   // src/lib/services/logger.ts
   maxFiles: '7d'  // Keep only 7 days
   ```

2. Reduce file size limit (default: 20MB)
   ```typescript
   maxSize: '10m'  // Max 10MB per file
   ```

3. Enable compression (already enabled)
   ```typescript
   zippedArchive: true
   ```

### Issue: Too much debug noise

**Symptoms**: Logs flooded with debug messages in production

**Solutions**:
1. Set production log level to `info`
   ```bash
   # .env
   LOG_LEVEL=info
   NODE_ENV=production
   ```

2. Remove excessive debug calls
   ```typescript
   // ❌ Remove noisy logs
   log.debug("Function entered");
   log.debug("Variable x =", x);

   // ✅ Keep meaningful debug
   log.debug("Cache miss, fetching from DB", { key });
   ```

### Issue: Missing context in error logs

**Symptoms**: Errors logged without enough information to debug

**Solutions**:
1. Add request/operation context
   ```typescript
   log.error("Operation failed", {
     error: error.message,
     userId: user.id,
     workspaceId: workspace.id,
     operation: "createBox",
     timestamp: Date.now()
   });
   ```

2. Use request IDs for correlation
   ```typescript
   const requestId = crypto.randomUUID();
   log.info("Request started", { requestId, endpoint });
   log.error("Request failed", { requestId, error });
   ```

### Issue: Logs directory in Git

**Symptoms**: Log files committed to repository

**Solutions**:
1. Verify `.gitignore` includes logs
   ```bash
   grep "logs" .gitignore
   # Should output: logs/*
   ```

2. Remove logs from Git
   ```bash
   git rm -r --cached logs/
   git commit -m "Remove logs from version control"
   ```

---

## Migration Notes

### Phase 1-3 Migration (Completed)

**Scope**: Backend services and API endpoints only
- ✅ Phase 1: Infrastructure (logger.ts, middleware)
- ✅ Phase 2: Service layer (6 files, 106 console calls)
- ✅ Phase 3: API endpoints (17 files, 49 console calls)

**Total**: 155 console calls → Winston logger

### Frontend Console Calls (Intentional)

Client-side components still use `console.*` for browser debugging:
- 46 console calls in React components, hooks, and Astro pages
- These are **intentional** for frontend development and debugging
- Browser DevTools remain the primary debugging interface for UI

---

## Additional Resources

- **Winston Documentation**: https://github.com/winstonjs/winston
- **Winston Daily Rotate**: https://github.com/winstonjs/winston-daily-rotate-file
- **RFC 5424 (Syslog)**: https://tools.ietf.org/html/rfc5424
- **Project Logging Implementation**: `.ai_docs/LOGGING_GUIDE.md` (this file)

---

## Support

For issues or questions:
1. Check this guide's [Troubleshooting](#troubleshooting) section
2. Review log files in `logs/` directory
3. Check Winston configuration in `src/lib/services/logger.ts`
4. Review related commits:
   - Phase 1: `32cb4c5` (Infrastructure)
   - Phase 2: `03a7a56` (Service Layer)
   - Phase 3: `7897511` (API Endpoints)
   - Formatting: `b84806a` (Prettier fixes)

---

**Last Updated**: January 5, 2026
**Version**: 1.0.0 (Post Phase 1-3 Migration)

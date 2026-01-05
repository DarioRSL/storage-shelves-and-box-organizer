# Logger Architecture - Dual Environment Logging System

**Document Version:** 1.0
**Date:** January 5, 2026
**Author:** Claude Code Assistant
**Last Updated:** 2026-01-05

---

## Overview

This document describes the dual logger architecture implemented for the Storage & Box Organizer application to support both browser (React components) and server (Node.js API endpoints) environments.

### Problem Statement

**Challenge:** Winston is a powerful Node.js logging library, but it depends on Node.js APIs (`process`, `fs`, etc.) that don't exist in browser environments.

**Symptom:** When React components import Winston logger, the browser throws:
```
ReferenceError: Can't find variable: process
```

**Root Cause:**
- Astro bundles both server and client code
- React components run in the browser
- Browser doesn't have Node.js APIs
- Winston tries to access `process.env`, `fs.createWriteStream()`, etc.

**Solution:** Dual logger architecture with environment-specific implementations.

---

## Architecture

### File Structure

```
src/lib/services/
├── logger.ts            ← Server-side Winston logger (Node.js only)
└── logger.client.ts     ← Client-side console wrapper (browser-safe)
```

### Import Decision Tree

```
┌─────────────────────────────────────┐
│ Is this file a React component      │
│ running in the browser?              │
└──────────┬──────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
   YES           NO
    │             │
    ▼             ▼
┌─────────┐   ┌─────────┐
│ USE:    │   │ USE:    │
│ logger. │   │ logger. │
│ client  │   │ ts      │
│ .ts     │   │ (Winston)│
└─────────┘   └─────────┘
```

---

## Implementation Details

### Server-Side Logger (`logger.ts`)

**Purpose:** Production-grade logging for Node.js environments (API endpoints, middleware, services)

**Technology:** Winston 3.19.0

**Features:**
- Structured logging with metadata
- Multiple transports (console, file, rotation)
- Log levels: error, warn, info, debug
- Daily file rotation (via winston-daily-rotate-file)
- Environment-specific configuration (dev vs. prod)

**Configuration:**

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const isDevelopment = process.env.NODE_ENV === 'development';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

export const log = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: logFormat,
  defaultMeta: { service: 'storage-organizer' },
  transports: [
    // Console (development only)
    ...(isDevelopment
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ timestamp, level, message, ...meta }) => {
                  return `${timestamp} [${level}] ${message} ${
                    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                  }`;
                }
              )
            ),
          }),
        ]
      : []),

    // File rotation (all environments)
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),

    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});
```

**Export Interface:**

```typescript
export interface LogMetadata {
  userId?: string;
  workspaceId?: string;
  boxId?: string;
  locationId?: string;
  qrCodeId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export const log = {
  error: (message: string, meta?: LogMetadata) => void,
  warn: (message: string, meta?: LogMetadata) => void,
  info: (message: string, meta?: LogMetadata) => void,
  debug: (message: string, meta?: LogMetadata) => void,
};
```

**Usage Example:**

```typescript
// API endpoint (server-side)
import { log } from '@/lib/services/logger';

export const GET: APIRoute = async ({ locals, params }) => {
  log.info('Fetching box', { boxId: params.id, userId: locals.user?.id });

  try {
    const box = await getBox(locals.supabase, params.id);
    log.info('Box fetched successfully', { boxId: params.id });
    return new Response(JSON.stringify(box), { status: 200 });
  } catch (error) {
    log.error('Failed to fetch box', {
      boxId: params.id,
      error: error instanceof Error ? error.message : String(error),
      userId: locals.user?.id,
    });
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }
};
```

---

### Client-Side Logger (`logger.client.ts`)

**Purpose:** Browser-safe logging for React components running in the browser

**Technology:** Native browser `console` API wrapper

**Features:**
- Identical API to Winston logger (drop-in replacement)
- Support for metadata objects
- Type-safe with same `LogMetadata` interface
- No Node.js dependencies
- Works in all browsers

**Implementation:**

```typescript
/* eslint-disable no-console */
/**
 * Client-side logger that uses browser console
 * This file is used in React components running in the browser
 */

export interface LogMetadata {
  userId?: string;
  workspaceId?: string;
  boxId?: string;
  locationId?: string;
  qrCodeId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export const log = {
  error: (message: string, meta?: LogMetadata) => {
    if (meta && Object.keys(meta).length > 0) {
      console.error(message, meta);
    } else {
      console.error(message);
    }
  },

  warn: (message: string, meta?: LogMetadata) => {
    if (meta && Object.keys(meta).length > 0) {
      console.warn(message, meta);
    } else {
      console.warn(message);
    }
  },

  info: (message: string, meta?: LogMetadata) => {
    if (meta && Object.keys(meta).length > 0) {
      console.log(message, meta);
    } else {
      console.log(message);
    }
  },

  debug: (message: string, meta?: LogMetadata) => {
    if (meta && Object.keys(meta).length > 0) {
      console.debug(message, meta);
    } else {
      console.debug(message);
    }
  },
};
```

**Usage Example:**

```typescript
// React component (client-side)
import { log } from '@/lib/services/logger.client';

export function BoxForm({ boxId }: BoxFormProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    log.info('Submitting box form', { boxId });

    try {
      await submitForm();
      log.info('Box form submitted successfully', { boxId });
    } catch (error) {
      log.error('Failed to submit box form', {
        boxId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // ... component code
}
```

---

## File-by-File Import Guide

### Files Using `logger.ts` (Server-Side Winston)

**API Endpoints:**
- `src/pages/api/**/*.ts` (all API endpoints)
- `src/middleware/index.ts`

**Services:**
- `src/lib/services/**/*.ts` (except logger.client.ts)

**Example:**
```typescript
import { log } from '@/lib/services/logger';
```

---

### Files Using `logger.client.ts` (Browser-Safe)

**React Components:**
- `src/components/AuthLayout.tsx`
- `src/components/box-details/QrCodeDisplay.tsx`
- `src/components/dashboard/BoxEditorModal.tsx`
- `src/components/dashboard/DashboardContainer.tsx`
- `src/components/dashboard/LocationEditorModal.tsx`
- `src/components/dashboard/UserMenu.tsx`
- `src/components/forms/BoxForm.tsx`
- `src/components/forms/LocationTree.tsx`
- `src/components/settings/LogoutButton.tsx`

**React Hooks:**
- `src/components/hooks/useBoxForm.ts`
- `src/components/hooks/useForm.ts`
- `src/components/hooks/useLocalStorage.ts`
- `src/components/hooks/useTheme.ts`
- `src/components/qr-generator/hooks/useQRCodeGeneration.ts`

**Client Libraries:**
- `src/lib/api-client.ts`

**Stores:**
- `src/lib/stores/auth.store.ts`
- `src/lib/stores/theme.store.ts`

**Example:**
```typescript
import { log } from '@/lib/services/logger.client';
```

---

## API Comparison

### Identical API

Both loggers export identical interface:

```typescript
// logger.ts (Winston)
export const log = {
  error: (message: string, meta?: LogMetadata) => void,
  warn: (message: string, meta?: LogMetadata) => void,
  info: (message: string, meta?: LogMetadata) => void,
  debug: (message: string, meta?: LogMetadata) => void,
};

// logger.client.ts (Console)
export const log = {
  error: (message: string, meta?: LogMetadata) => void,
  warn: (message: string, meta?: LogMetadata) => void,
  info: (message: string, meta?: LogMetadata) => void,
  debug: (message: string, meta?: LogMetadata) => void,
};
```

**Benefit:** Code can be refactored between client and server with minimal changes (just update import path).

---

## Log Levels

### Production Behavior

| Level | Winston (Server) | Console (Browser) | Production Visibility |
|-------|------------------|-------------------|----------------------|
| **error** | File + Console | console.error() | ✅ Visible (file logs) |
| **warn** | File + Console | console.warn() | ✅ Visible (file logs) |
| **info** | File only | console.log() | ✅ Visible (file logs) |
| **debug** | Disabled | console.debug() | ❌ Disabled |

### Development Behavior

| Level | Winston (Server) | Console (Browser) | Development Visibility |
|-------|------------------|-------------------|----------------------|
| **error** | Colorized Console + File | console.error() | ✅ Visible |
| **warn** | Colorized Console + File | console.warn() | ✅ Visible |
| **info** | Colorized Console + File | console.log() | ✅ Visible |
| **debug** | Colorized Console + File | console.debug() | ✅ Visible |

---

## Metadata Best Practices

### Always Include Context

```typescript
// ❌ Bad: No context
log.error('Failed to load data');

// ✅ Good: With context
log.error('Failed to load box data', {
  boxId: params.id,
  userId: locals.user?.id,
  error: error.message,
});
```

### Use Standard Keys

```typescript
interface LogMetadata {
  userId?: string;        // User performing action
  workspaceId?: string;   // Workspace context
  boxId?: string;         // Box identifier
  locationId?: string;    // Location identifier
  qrCodeId?: string;      // QR code identifier
  requestId?: string;     // Request tracking
  error?: string;         // Error message
  duration?: string;      // Operation duration
  [key: string]: unknown; // Additional context
}
```

### Example Usage

```typescript
// API endpoint
log.info('Creating new box', {
  userId: locals.user.id,
  workspaceId: body.workspace_id,
});

// React component
log.error('Form validation failed', {
  boxId: formState.currentBox?.id,
  errors: formState.errors,
});

// Hook
log.debug('Loading QR codes', {
  workspaceId: currentWorkspaceId,
  count: availableQRCodes.length,
});
```

---

## Migration Guide

### From `console.log` to Logger

**Before:**
```typescript
console.log('User logged in', user.id);
console.error('Failed to fetch:', error);
```

**After (Client-side):**
```typescript
import { log } from '@/lib/services/logger.client';

log.info('User logged in', { userId: user.id });
log.error('Failed to fetch box', { error: error.message, boxId: id });
```

**After (Server-side):**
```typescript
import { log } from '@/lib/services/logger';

log.info('User logged in', { userId: user.id });
log.error('Failed to fetch box', { error: error.message, boxId: id });
```

---

## Common Pitfalls

### ❌ Importing Winston in React Components

```typescript
// ❌ WRONG: This will crash in browser!
import { log } from '@/lib/services/logger';  // Winston!

export function MyComponent() {
  // ReferenceError: Can't find variable: process
  log.info('Component mounted');
}
```

**Fix:**
```typescript
// ✅ CORRECT: Use client logger in React components
import { log } from '@/lib/services/logger.client';

export function MyComponent() {
  log.info('Component mounted');  // Works in browser!
}
```

### ❌ Using `console` Directly

```typescript
// ❌ WRONG: Not production-ready
console.log('Box created');
console.error('Error:', error);
```

**Fix:**
```typescript
// ✅ CORRECT: Use logger
import { log } from '@/lib/services/logger.client';

log.info('Box created', { boxId: box.id });
log.error('Box creation failed', { error: error.message });
```

### ❌ Not Including Metadata

```typescript
// ❌ WRONG: No context
log.error('Failed to save');
```

**Fix:**
```typescript
// ✅ CORRECT: Include context
log.error('Failed to save box', {
  boxId: params.id,
  userId: locals.user?.id,
  error: error.message,
});
```

---

## Testing

### How to Verify Logger Works

**Client-side (Browser Console):**
```typescript
// In React component
import { log } from '@/lib/services/logger.client';

log.info('Testing client logger', { test: true });
// Opens browser console → should see: "Testing client logger" {test: true}
```

**Server-side (Winston Logs):**
```typescript
// In API endpoint
import { log } from '@/lib/services/logger';

log.info('Testing server logger', { test: true });
// Check logs/combined-2026-01-05.log:
// {"level":"info","message":"Testing server logger","service":"storage-organizer","test":true,"timestamp":"2026-01-05 14:23:45"}
```

---

## File Rotation

Winston automatically rotates log files daily:

```
logs/
├── combined-2026-01-05.log      ← Today's combined logs
├── combined-2026-01-04.log      ← Yesterday
├── combined-2026-01-03.log
├── error-2026-01-05.log         ← Today's errors
├── error-2026-01-04.log
└── error-2026-01-03.log
```

**Retention:** 14 days
**Max Size:** 20MB per file
**Location:** `logs/` directory (gitignored)

---

## Security Considerations

### Never Log Sensitive Data

```typescript
// ❌ WRONG: Logging password
log.info('User logging in', { password: password });

// ❌ WRONG: Logging full JWT
log.info('Token received', { token: jwtToken });

// ❌ WRONG: Logging credit card
log.info('Payment processed', { cardNumber: card.number });
```

**Fix:**
```typescript
// ✅ CORRECT: Log safe metadata only
log.info('User logging in', { userId: user.id });

// ✅ CORRECT: Log token type only
log.info('Token received', { tokenType: 'Bearer' });

// ✅ CORRECT: Log last 4 digits only
log.info('Payment processed', { last4: card.last4 });
```

### ESLint Configuration

The client logger has `/* eslint-disable no-console */` at the top because it **intentionally** uses console API. This is safe and expected.

**Server logger** should NEVER have `console` statements (use Winston methods instead).

---

## Future Enhancements

### Potential Improvements

1. **Remote Logging Service**
   - Send logs to external service (e.g., Datadog, Sentry)
   - Real-time error alerting
   - Log aggregation and search

2. **Log Sampling**
   - Sample high-volume logs (e.g., 1% of info logs)
   - Reduce storage costs
   - Maintain error/warn 100% coverage

3. **User Action Tracking**
   - Track user interactions (clicks, form submissions)
   - Analytics integration
   - User journey mapping

4. **Performance Metrics**
   - Log API endpoint durations
   - Database query performance
   - Frontend render times

---

## Summary

### Key Takeaways

1. **Two Loggers, One API**
   - `logger.ts` for server (Winston)
   - `logger.client.ts` for browser (Console)
   - Identical interface for consistency

2. **Import Rules**
   - React components → `logger.client.ts`
   - API endpoints → `logger.ts`
   - When in doubt → check if file runs in browser

3. **Always Include Metadata**
   - Use structured logging
   - Include userId, boxId, workspaceId, etc.
   - Never log sensitive data

4. **Production-Ready**
   - File rotation (14 days)
   - Error tracking
   - Development-friendly console output

---

**Document Version:** 1.0
**Last Updated:** 2026-01-05
**Maintained By:** Development Team
**Related Documents:**
- `.ai_docs/review/ESLINT_RESOLUTION_SESSION_2026_01_05.md` (Session documentation)
- `.ai_docs/review/BLOCKER_FIXES_CHECKLIST.md` (Blocker status)
- `src/lib/services/logger.ts` (Server logger implementation)
- `src/lib/services/logger.client.ts` (Client logger implementation)

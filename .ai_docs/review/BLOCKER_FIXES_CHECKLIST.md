# BLOCKER FIXES CHECKLIST
**Date:** 2025-12-31 | **Priority:** CRITICAL | **Target Completion:** 2025-01-02

---

## OVERVIEW

This document lists all critical blockers preventing MVP deployment with specific action items and time estimates.

**Total Estimated Work:** 36-49 hours
**Critical Path:** Fix blockers → Test → Deploy

---

## BLOCKER 1: ESLint Code Quality (73 ERRORS)

### Status: ❌ FAILING
**Severity:** CRITICAL | **Estimated Fix Time:** 4-6 hours

### Errors Breakdown

#### Category A: Unused Variables (8 errors - ~30 minutes)
```
FILE: src/components/dashboard/BoxListItem.tsx
- Line 23: 'isHovered' is assigned but never used
  FIX: Remove the isHovered state or use it in JSX

FILE: src/components/dashboard/DashboardContainer.tsx
- Line 16: 'LocationTreeNode' imported but never used
  FIX: Remove unused import
- Line 17: 'BoxListItem' imported but never used
  FIX: Remove unused import
- Line 38: '$userProfile' assigned but never used
  FIX: Remove or use in component
- Line 178: 'itemName' parameter unused
  FIX: Remove parameter or use in function

FILE: src/stores/dashboard.ts
- Line 21-27, 33: 'any' types in store definitions
  FIX: Replace with proper TypeScript types
```

**Action Items:**
- [ ] Remove `isHovered` state from BoxListItem
- [ ] Clean up unused imports in DashboardContainer
- [ ] Remove unused `$userProfile` subscription
- [ ] Remove unused `itemName` parameter
- [ ] Replace `any` types in dashboard.store with proper types

---

#### Category B: Prettier Formatting (31 errors - ~1.5 hours)
```
FILE: src/components/forms/BoxForm.tsx
- Lines 26, 35-41, 51-52, 66: Formatting/indentation issues
  FIX: Run prettier with --write flag

SOLUTION:
  npx prettier --write src/components/forms/BoxForm.tsx
```

**Action Items:**
- [ ] Run prettier auto-fix on all components
- [ ] Verify no logic changes occurred
- [ ] Review whitespace-only changes

---

#### Category C: Accessibility (5 errors - ~2 hours)

```
FILE: src/components/dashboard/LocationTree.tsx
- Line 47: aria-selected not supported by role="button"
  ISSUE: Using aria-selected on button role
  FIX: Change to role="treeitem" or remove aria-selected

FILE: src/components/dashboard/LocationTreeNode.tsx
- Line 68: role="treeitem" missing required aria-selected
  ISSUE: ARIA spec requires aria-selected for treeitem
  FIX: Add aria-selected={isSelected} to element

- Line 102: aria-selected not supported on button
  ISSUE: Button role doesn't support aria-selected
  FIX: Change to role="treeitem" or different element

- Line 156: Forbidden non-null assertion (!)
  ISSUE: TypeScript no-non-null-assertion rule
  FIX: Add proper null check or TypeScript guard
```

**Detailed Fixes:**

```typescript
// BEFORE (LocationTreeNode.tsx)
<button
  role="treeitem"
  aria-selected={false}  // ❌ button role doesn't support this
>

// AFTER
<div
  role="treeitem"
  aria-selected={isSelected}
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
```

**Action Items:**
- [ ] Change LocationTree to use semantic tree structure
- [ ] Fix LocationTreeNode to properly support ARIA roles
- [ ] Add keyboard navigation handlers
- [ ] Add null safety checks (remove !)
- [ ] Test with keyboard navigation
- [ ] Test with screen reader (NVDA/JAWS)

---

#### Category D: TypeScript `any` Types (4 errors - ~30 minutes)

```
FILE: src/middleware/index.ts
- Line 93: Unexpected any type in JWT decode
  FIX: Use JwtPayload interface from jsonwebtoken

FILE: src/pages/api/auth/session.ts
- Line 14: Unexpected any in request body
  FIX: Create RequestBody type
- Line 51: Unexpected any in response
  FIX: Create ResponseBody type

FILE: src/stores/dashboard.ts
- Lines 21, 24, 27, 33: Unexpected any in store
  FIX: Define proper interface for each store value
```

**Action Items:**
- [ ] Create RequestBody interface for session endpoint
- [ ] Create ResponseBody interface
- [ ] Use JwtPayload from jsonwebtoken
- [ ] Define DashboardStore interface

---

#### Category E: Unescaped Entities (2 errors - ~15 minutes)

```
FILE: src/components/dashboard/DeleteConfirmationDialog.tsx
- Line 55: Unescaped double quotes in JSX text
  ISSUE: " needs to be escaped in JSX
  FIX: Use &quot; or change quote style

EXAMPLE:
// BEFORE
<p>Are you sure you want to delete "{name}"?</p>

// AFTER
<p>Are you sure you want to delete &quot;{name}&quot;?</p>
// OR
<p>Are you sure you want to delete '{name}'?</p>
```

**Action Items:**
- [ ] Update DeleteConfirmationDialog to use single quotes
- [ ] Verify all JSX entities are properly escaped

---

### Implementation Steps

```bash
# Step 1: Run auto-fix (handles Prettier and some fixes)
npm run lint:fix

# Step 2: Manual fixes for remaining errors
# (Follow Category A-E fixes above)

# Step 3: Run linter to verify
npm run lint

# Step 4: Commit with message
git add -A
git commit -m "fix: resolve all ESLint errors (73 issues fixed)"
```

---

## BLOCKER 2: Debug Console.log Statements (60+ INSTANCES)

### Status: ❌ FAILING
**Severity:** HIGH | **Estimated Fix Time:** 2-3 hours

### Problem Analysis

**Total console.log instances found:** 60+

**Distribution:**
- API Endpoints: ~40 instances
- Components: ~8 instances
- Middleware: ~4 instances
- Services: ~2 instances

### Affected Files

#### API Endpoints

| File | Count | Lines | Priority |
|------|-------|-------|----------|
| `src/pages/api/auth/session.ts` | 12 | Multiple | HIGH |
| `src/pages/api/boxes/[id].ts` | 6 | Multiple | HIGH |
| `src/pages/api/boxes.ts` | 4 | 140, 241 | MEDIUM |
| `src/pages/api/locations/[id].ts` | 2 | 160, 265 | MEDIUM |
| `src/pages/api/qr-codes/batch.ts` | 4 | Multiple | MEDIUM |
| `src/pages/api/workspaces.ts` | 3 | Multiple | MEDIUM |
| `src/pages/api/workspaces/[workspace_id].ts` | 3 | Multiple | MEDIUM |
| Other endpoints | 10+ | Various | LOW |

#### Components

| File | Count | Lines | Context |
|------|-------|-------|---------|
| `src/components/AuthLayout.tsx` | 6 | 29, 33, 42, 46, 49, 54 | Auth debugging |
| `src/components/dashboard/BoxEditorModal.tsx` | 1 | 76 | Modal debugging |
| `src/components/dashboard/LocationEditorModal.tsx` | 1 | 73 | Modal debugging |
| `src/components/forms/BoxForm.tsx` | 1 | 100 | Form debugging |
| `src/components/dashboard/UserMenu.tsx` | 1 | 27 | Menu debugging |
| Other components | 2+ | Various | Various |

### Strategy & Implementation

#### Phase 1: Remove Immediate (Non-Production)

These console.log statements are obviously debugging and can be removed:

```typescript
// REMOVE THESE:
console.log("Auth Layout loaded");
console.log("User:", user);
console.log("Token:", token);
console.log("Form submitted");
console.log("Box editor modal opened");
```

**Files:** AuthLayout.tsx, BoxEditorModal.tsx, LocationEditorModal.tsx, UserMenu.tsx

**Action Items:**
- [ ] Remove all obvious debug logs from components
- [ ] Remove form debugging logs
- [ ] Remove modal lifecycle logs
- **Time: 30 minutes**

---

#### Phase 2: Replace with Structured Logging (Critical)

These console.log statements should be converted to structured logging:

```typescript
// BEFORE (src/pages/api/auth/session.ts)
console.log("[Session] Creating session for user:", user.id);
console.error("Failed to decode token:", err.message);

// AFTER (using Winston logger)
import { logger } from '@/lib/services/logger';

logger.info('[Session] Creating session', { userId: user.id });
logger.error('[Session] Failed to decode token', { error: err.message });
```

**Files to Update (Priority Order):**
1. `src/pages/api/auth/session.ts` (12 instances) - Security critical
2. `src/pages/api/boxes/[id].ts` (6 instances)
3. `src/pages/api/boxes.ts` (4 instances)
4. `src/pages/api/qr-codes/batch.ts` (4 instances)
5. All other API endpoints

**Action Items:**
- [ ] Create logger service using Winston (see BLOCKER 3)
- [ ] Replace all API endpoint console.log with logger calls
- [ ] Ensure sensitive data is not logged
- [ ] Log levels: info for success, warn for validation, error for exceptions
- **Time: 2-2.5 hours**

---

### Implementation Checklist

```bash
# Step 1: Create logging service (prerequisite)
# (See BLOCKER 3 for implementation)

# Step 2: Remove component debug logs
grep -r "console\." src/components/ | grep -v "console.error"
# Then manually remove from:
- AuthLayout.tsx
- BoxEditorModal.tsx
- LocationEditorModal.tsx
- UserMenu.tsx
- BoxForm.tsx

# Step 3: Replace API endpoint logs with logger
# For each file in API endpoints:
1. Import logger: import { logger } from '@/lib/services/logger'
2. Replace console.log with logger.info
3. Replace console.error with logger.error
4. Replace console.warn with logger.warn

# Step 4: Verify no console statements remain
grep -r "console\.log\|console\.error\|console\.warn" src/ --exclude-dir=node_modules

# Step 5: Test all endpoints
npm run dev
# Then test API calls in browser/Postman

# Step 6: Commit
git add -A
git commit -m "feat: replace console.log with structured logging (Winston)"
```

---

## BLOCKER 3: No Production Logging System

### Status: ❌ NOT IMPLEMENTED
**Severity:** HIGH | **Estimated Implementation Time:** 8-10 hours

### Requirements

From PRD Todo:
> "simple logging based on winston"

### Architecture Design

```
src/lib/services/
├── logger.ts               ← Main logger instance
├── logger.config.ts        ← Configuration
└── logger.middleware.ts    ← Request/response middleware
```

### Implementation Steps

#### Step 1: Install Winston (5 minutes)

```bash
npm install winston winston-daily-rotate-file
npm install --save-dev @types/winston
```

#### Step 2: Create Logger Service (1 hour)

**File:** `src/lib/services/logger.ts`

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { Request, Response } from 'express';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: logFormat,
  defaultMeta: { service: 'storage-organizer' },
  transports: [
    // Console transport (development)
    ...(isDevelopment
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                return `${timestamp} [${level}] ${message} ${
                  Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                }`;
              })
            ),
          }),
        ]
      : []),

    // File transport (all environments)
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

// Create request/response logger middleware
export function loggerMiddleware(
  req: Request,
  res: Response,
  next: Function
) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.id,
    };

    if (res.statusCode >= 400) {
      logger.warn('Request failed', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}

// Helper functions for consistent logging
export const logApiCall = (
  method: string,
  endpoint: string,
  data?: object
) => {
  logger.info(`${method} ${endpoint}`, { data });
};

export const logApiError = (
  method: string,
  endpoint: string,
  error: Error
) => {
  logger.error(`${method} ${endpoint} failed`, {
    error: error.message,
    stack: error.stack,
  });
};

export const logDatabaseOperation = (
  operation: string,
  table: string,
  data?: object
) => {
  logger.debug(`DB ${operation} on ${table}`, { data });
};
```

**Action Items:**
- [ ] Create logger.ts with Winston configuration
- [ ] Configure daily log rotation
- [ ] Set appropriate log levels
- [ ] Export logger instance for use throughout app

---

#### Step 3: Integrate Logger with Middleware (30 minutes)

**File:** `src/middleware/index.ts` (update existing)

```typescript
import { logger } from '@/lib/services/logger';
import type { MiddlewareNext } from 'astro';

export const onRequest: MiddlewareNext = async (context, next) => {
  const start = Date.now();

  try {
    // ... existing middleware code ...

    const response = await next();
    const duration = Date.now() - start;

    // Log successful requests
    logger.info('Request processed', {
      method: context.request.method,
      path: new URL(context.request.url).pathname,
      statusCode: response.status,
      duration: `${duration}ms`,
      userId: context.locals.user?.id,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Request failed', {
      method: context.request.method,
      path: new URL(context.request.url).pathname,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : String(error),
      userId: context.locals.user?.id,
    });
    throw error;
  }
};
```

**Action Items:**
- [ ] Update middleware to use logger
- [ ] Add try-catch for error logging
- [ ] Log request duration and userId
- [ ] Ensure no sensitive data is logged

---

#### Step 4: Update All API Endpoints (2-3 hours)

Example pattern:

```typescript
// Before
export const GET: APIRoute = async ({ locals, params }) => {
  console.log("[Boxes] Fetching box:", params.id);
  try {
    const box = await getBox(locals.supabase, params.id);
    console.log("[Boxes] Box fetched successfully");
    return new Response(JSON.stringify(box), { status: 200 });
  } catch (error) {
    console.error("[Boxes] Failed to fetch:", error);
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }
};

// After
import { logger, logApiCall, logApiError } from '@/lib/services/logger';

export const GET: APIRoute = async ({ locals, params }) => {
  logApiCall('GET', `/boxes/${params.id}`);
  try {
    const box = await getBox(locals.supabase, params.id);
    logger.info('Box fetched', { boxId: params.id });
    return new Response(JSON.stringify(box), { status: 200 });
  } catch (error) {
    logApiError('GET', `/boxes/${params.id}`, error as Error);
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }
};
```

**Files to Update (in priority order):**
1. `src/pages/api/auth/session.ts` - Critical auth logging
2. `src/pages/api/boxes.ts` - Core operations
3. `src/pages/api/boxes/[id].ts` - Core operations
4. `src/pages/api/locations/index.ts` - Location operations
5. `src/pages/api/locations/[id].ts` - Location operations
6. `src/pages/api/qr-codes/batch.ts` - QR generation
7. `src/pages/api/workspaces.ts` - Workspace operations
8. All remaining API endpoints

**Action Items:**
- [ ] Create helper functions (logApiCall, logApiError, logDbOperation)
- [ ] Update each API endpoint to use logger
- [ ] Remove console.log statements
- [ ] Ensure PII is not logged (passwords, tokens, etc.)
- [ ] Test each endpoint

---

#### Step 5: Update .gitignore for Logs (5 minutes)

```bash
# Add to .gitignore
logs/
logs/*.log
*.log
npm-debug.log*

# Except
!logs/.gitkeep
```

---

#### Step 6: Create Logging Guide (30 minutes)

**File:** `src/lib/services/LOGGING_GUIDE.md`

```markdown
# Logging Guide

## Log Levels

- **ERROR**: Critical failures that need immediate attention
- **WARN**: Validation failures, recoverable errors
- **INFO**: Successful operations, state changes
- **DEBUG**: Detailed debugging info (not visible in production)

## Examples

### API Endpoint Logging
\`\`\`typescript
import { logger } from '@/lib/services/logger';

export const POST: APIRoute = async ({ locals, request }) => {
  logger.info('Creating box', { workspaceId: locals.user.workspaceId });

  try {
    const box = await createBox(...);
    logger.info('Box created', { boxId: box.id });
    return successResponse(box);
  } catch (error) {
    logger.error('Failed to create box', {
      workspaceId: locals.user.workspaceId,
      error: error.message,
    });
    return errorResponse(error, 500);
  }
};
\`\`\`

### Database Operations
\`\`\`typescript
logger.debug('Querying boxes', { userId: user.id, limit: 50 });
logger.info('Boxes found', { count: 10 });
\`\`\`

### Never Log
- Passwords
- API Keys
- JWTs
- Credit cards
- Personal identification numbers
\`\`\`

---

### Step 7: Verify Logger Works (30 minutes)

```bash
# Step 1: Start dev server
npm run dev

# Step 2: Test API endpoints
curl http://localhost:3000/api/boxes

# Step 3: Check logs
tail -f logs/combined-*.log

# Step 4: Verify no console.log statements remain
grep -r "console\." src/ --exclude-dir=node_modules
```

**Action Items:**
- [ ] Start dev server
- [ ] Make test API calls
- [ ] Verify logs are created in `/logs` directory
- [ ] Confirm log format is readable
- [ ] Test log rotation (daily files)
- [ ] Commit changes

---

### Implementation Checklist

```bash
# Phase 1: Setup (1.5 hours)
- [ ] npm install winston winston-daily-rotate-file
- [ ] Create logger.ts with Winston config
- [ ] Create LOGGING_GUIDE.md
- [ ] Update .gitignore

# Phase 2: Middleware Integration (30 min)
- [ ] Update middleware/index.ts to use logger
- [ ] Test middleware logging

# Phase 3: API Endpoints (2-3 hours)
- [ ] Update auth/session.ts
- [ ] Update boxes.ts endpoints
- [ ] Update boxes/[id].ts endpoints
- [ ] Update locations endpoints
- [ ] Update qr-codes endpoints
- [ ] Update workspaces endpoints
- [ ] Update all other API endpoints

# Phase 4: Verification (30 min)
- [ ] Remove all remaining console.log
- [ ] Test all endpoints
- [ ] Verify logs in /logs directory
- [ ] Run npm run lint to ensure no console statements

# Phase 5: Commit (10 min)
- [ ] git add -A
- [ ] git commit -m "feat: implement Winston logging system"
```

---

## BLOCKER 4: Accessibility Issues in Tree Component

### Status: ❌ FAILING
**Severity:** MEDIUM | **Estimated Fix Time:** 3-4 hours

### Issues Found

| File | Line | Issue | WCAG Level |
|------|------|-------|-----------|
| LocationTree.tsx | 47 | aria-selected on button role | AA |
| LocationTreeNode.tsx | 68 | treeitem missing aria-selected | AA |
| LocationTreeNode.tsx | 102 | aria-selected on button | AA |
| LocationTreeNode.tsx | 156 | Non-null assertion | Code quality |

### Root Cause Analysis

The LocationTree component is using a hybrid approach:
- Role="button" for click handling
- ARIA attributes for tree semantics
- Not supporting keyboard navigation

This violates ARIA spec and breaks screen reader support.

### Solution: Proper Tree Component Implementation

#### Current (Broken) Structure

```typescript
// LocationTree.tsx - WRONG
<button
  role="button"
  onClick={handleClick}
  aria-selected={false}  // ❌ button doesn't support aria-selected
>
```

#### Fixed Structure

```typescript
// LocationTree.tsx - CORRECT
<div
  role="tree"
  aria-label="Location hierarchy"
>
  {/* Tree items here */}
</div>

// LocationTreeNode.tsx - CORRECT
<div
  role="treeitem"
  aria-expanded={isExpanded}
  aria-selected={isSelected}
  tabIndex={isSelected ? 0 : -1}
  onKeyDown={handleKeyDown}
  onClick={handleClick}
>
  {/* Content */}
</div>
```

### Implementation Steps

#### Step 1: Update LocationTree.tsx (45 minutes)

**Changes needed:**
```typescript
// BEFORE
const LocationTree = ({ nodes, onSelect, selected }) => {
  return (
    <div className="location-tree">
      {nodes.map(node => (
        <button
          key={node.id}
          role="button"
          onClick={() => onSelect(node.id)}
          aria-selected={selected === node.id}
        >
          {node.name}
        </button>
      ))}
    </div>
  );
};

// AFTER
const LocationTree = ({ nodes, onSelect, selected }) => {
  return (
    <div
      role="tree"
      aria-label="Location hierarchy"
      className="location-tree"
    >
      {nodes.map(node => (
        <LocationTreeNode
          key={node.id}
          node={node}
          onSelect={onSelect}
          isSelected={selected === node.id}
        />
      ))}
    </div>
  );
};
```

**Action Items:**
- [ ] Add role="tree" to root container
- [ ] Add aria-label
- [ ] Remove aria-selected from buttons
- [ ] Use LocationTreeNode for recursive rendering

---

#### Step 2: Update LocationTreeNode.tsx (1 hour)

**Changes needed:**
```typescript
import { useRef, useEffect } from 'react';

interface TreeNodeProps {
  node: LocationNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  level?: number;
}

const LocationTreeNode = ({
  node,
  isSelected,
  onSelect,
  level = 0,
}: TreeNodeProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Focus selected node for keyboard navigation
  useEffect(() => {
    if (isSelected && nodeRef.current) {
      nodeRef.current.focus();
    }
  }, [isSelected]);

  // Keyboard handlers for WCAG compliance
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(node.id);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (node.children?.length) {
          setIsExpanded(true);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (node.children?.length) {
          setIsExpanded(false);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div role="none">
      <div
        ref={nodeRef}
        role="treeitem"
        aria-expanded={node.children?.length ? isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={isSelected ? 0 : -1}
        aria-level={level + 1}
        onKeyDown={handleKeyDown}
        onClick={() => {
          onSelect(node.id);
          if (node.children?.length) {
            setIsExpanded(!isExpanded);
          }
        }}
        className={`tree-node ${isSelected ? 'selected' : ''}`}
      >
        {node.children?.length ? (
          <button
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="tree-expand-btn"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="tree-expand-placeholder" />
        )}
        <span>{node.name}</span>
      </div>

      {isExpanded && node.children && (
        <div role="group">
          {node.children.map((child) => (
            <LocationTreeNode
              key={child.id}
              node={child}
              isSelected={isSelected}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationTreeNode;
```

**Key Changes:**
- ✅ Proper role="treeitem" structure
- ✅ aria-expanded for expanded state
- ✅ aria-selected for selection
- ✅ tabIndex management for keyboard focus
- ✅ aria-level for hierarchy depth
- ✅ Keyboard navigation (Enter, Space, ArrowRight, ArrowLeft)
- ✅ Removed non-null assertions
- ✅ Focus management with useEffect

**Action Items:**
- [ ] Replace LocationTreeNode.tsx with new implementation
- [ ] Add keyboard navigation handlers
- [ ] Add proper ARIA attributes
- [ ] Add tabIndex management
- [ ] Remove non-null assertions
- [ ] Test with keyboard (Tab, Enter, Arrow keys)
- [ ] Test with screen reader

---

#### Step 3: Add CSS for Tree Styling (30 minutes)

**File:** `src/styles/tree.css` (new file)

```css
.location-tree {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tree-node:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.tree-node[aria-selected="true"] {
  background-color: rgb(59, 130, 246); /* blue-500 */
  color: white;
  font-weight: 500;
}

.tree-node:focus {
  outline: 2px solid rgb(59, 130, 246);
  outline-offset: 2px;
}

.tree-expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  transition: transform 0.2s;
}

.tree-expand-btn:hover {
  transform: scale(1.2);
}

.tree-expand-placeholder {
  width: 1.5rem;
  display: inline-block;
}

/* Nested group styling */
[role="group"] {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-left: 1.5rem;
  border-left: 1px solid rgba(0, 0, 0, 0.1);
}
```

**Action Items:**
- [ ] Create tree.css with proper styling
- [ ] Import in components
- [ ] Test visual hierarchy
- [ ] Verify keyboard focus indicators

---

#### Step 4: Testing (1 hour)

**Keyboard Navigation Test:**
```
1. Tab to tree → focus first node
2. Enter → select node
3. Arrow Right → expand node
4. Arrow Left → collapse node
5. Arrow Down → move to next node (if parallel trees)
6. Arrow Up → move to previous node (if parallel trees)
```

**Screen Reader Test:**
```
1. Use NVDA (Windows) or VoiceOver (Mac)
2. Navigate to tree with Tab
3. Verify: "Tree, Location hierarchy, 3 items"
4. Navigate with Arrow keys
5. Verify: "Tree item, Garage, expanded"
6. Verify role announcements
```

**Files to Test:**
- [ ] src/components/dashboard/LocationTree.tsx
- [ ] src/components/dashboard/LocationTreeNode.tsx
- [ ] src/components/forms/LocationSelector.tsx (uses tree)
- [ ] src/components/forms/LocationTree.tsx (if exists)

**Action Items:**
- [ ] Test with Firefox/Chrome dev tools
- [ ] Test keyboard navigation
- [ ] Test screen reader (if available)
- [ ] Test focus management
- [ ] Test with mobile/tablet
- [ ] Verify no console errors

---

### Implementation Checklist

```bash
# Step 1: Update Components (1:45)
- [ ] Update LocationTree.tsx
  - Add role="tree"
  - Add aria-label
  - Remove aria-selected from buttons

- [ ] Update LocationTreeNode.tsx
  - Add proper ARIA structure
  - Add keyboard navigation
  - Add focus management
  - Remove non-null assertions
  - Add useRef and useEffect

# Step 2: Add Styling (30 min)
- [ ] Create src/styles/tree.css
- [ ] Import in components
- [ ] Verify visual hierarchy

# Step 3: Testing (1 hour)
- [ ] Test keyboard navigation
- [ ] Test screen reader
- [ ] Test focus indicators
- [ ] Test expand/collapse
- [ ] Verify no console errors

# Step 4: Commit
- [ ] git add -A
- [ ] git commit -m "fix: improve accessibility in LocationTree component (WCAG AA)"
```

---

## BLOCKER 5: Prettier Formatting Issues

### Status: ✅ MOSTLY AUTO-FIXABLE
**Severity:** LOW | **Estimated Fix Time:** 1 hour

### Issue

31 Prettier formatting errors in src/components/forms/BoxForm.tsx

### Quick Fix

```bash
# Auto-fix all Prettier errors
npx prettier --write "src/components/forms/BoxForm.tsx"

# Verify fix worked
npm run lint | grep -i prettier
```

### Manual Verification

After running prettier, check:
- [ ] No logic changes
- [ ] Indentation is consistent
- [ ] Line lengths are reasonable
- [ ] All errors resolved

---

## SUMMARY: TOTAL EFFORT REQUIRED

### Timeline Breakdown

| Blocker | Effort | Priority | Parallel Possible |
|---------|--------|----------|-------------------|
| 1. ESLint Errors | 4-6 hrs | CRITICAL | No (depends on code logic) |
| 2. Console.log | 2-3 hrs | CRITICAL | No (depends on logger) |
| 3. Logging System | 8-10 hrs | HIGH | No (blocks console.log fixes) |
| 4. Accessibility | 3-4 hrs | MEDIUM | Yes (independent) |
| 5. Prettier | 1 hr | LOW | Yes (independent) |
| **Total** | **18-24 hrs** | — | — |

### Recommended Work Order

**Day 1 (6 hours):**
1. Prettier auto-fix (1 hour)
2. ESLint unused variables (1 hour)
3. Accessibility fixes (3 hours) - can run in parallel with #2
4. TypeScript any types (1 hour)

**Day 2 (12-18 hours):**
5. Create logging system (8-10 hours)
6. Replace console.log with logging (2-3 hours)
7. Verify & test (2-3 hours)

### Parallel Work Possible

- Prettier formatting (independent)
- Accessibility fixes (independent)
- Logging system design (while others work on other fixes)

### Testing Before Merge

```bash
# Before committing any fixes:
npm run lint          # ✅ 0 errors
npm run build         # ✅ Build succeeds
npm run dev           # ✅ Dev server works
grep -r "console\." src/  # ✅ No console statements
```

---

## NEXT STEPS AFTER BLOCKERS FIXED

Once all blockers are resolved:

1. ✅ **Create QR Generation UI Page** (Phase 5 continuation)
   - Estimated: 4-6 hours

2. ✅ **Complete Testing Cycle** (Phase 6)
   - Unit tests: 4-6 hours
   - E2E tests: 4-6 hours
   - Manual testing: 2-3 hours

3. ✅ **Security Audit** (Pre-launch)
   - Code review: 2-3 hours
   - Dependency audit: 1 hour
   - OWASP checklist: 2-3 hours

4. ✅ **Documentation Finalization**
   - Deployment guide: 1-2 hours
   - User guide: 2-3 hours
   - Known issues: 1 hour

---

## SIGN-OFF

This blocker checklist is comprehensive and ready for implementation.

**Created:** 2025-12-31
**Status:** READY FOR WORK
**Next Review:** After Day 1 completion

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Storage & Box Organizer** is a Progressive Web App (PWA) for managing items stored in boxes using a QR code system. Users can generate QR labels, scan them with their phone, and digitally manage box contents, locations, and search for items without opening boxes physically.

**Key Features:**

- QR code-based box identification and management
- Hierarchical location structure (up to 5 levels deep)
- Multi-tenant workspace system with role-based access
- Full-text search across box contents
- Mobile-first PWA design

## Tech Stack

- **Frontend:** Astro 5 (SSR with `@astrojs/node`), React 19, TypeScript 5
- **Styling:** Tailwind CSS 4, Shadcn/ui components
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security)
- **State:** Nano Stores
- **QR Generation:** react-qr-code / qrcode.react

## Common Development Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:3000
nvm use                  # Ensure correct Node.js version (22.14.0)

# Code Quality
npm run lint             # Check for code quality issues
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier

# Build & Deploy
npm run build            # Build for production to dist/
npm run preview          # Preview production build locally
```

## Project Structure

```
./src/
├── layouts/           # Astro layout components
├── pages/             # Astro pages (file-based routing)
│   └── api/          # API endpoints (SSR)
├── middleware/        # Astro middleware (index.ts)
├── components/        # UI components
│   ├── ui/           # Shadcn/ui components
│   └── hooks/        # Custom React hooks
├── lib/              # Services and utility functions
│   └── services/     # Business logic layer
├── db/               # Supabase configuration
│   ├── supabase.client.ts   # Supabase client setup
│   └── database.types.ts    # Generated DB types
├── types.ts          # Shared types (Entities, DTOs, API contracts)
├── assets/           # Static internal assets
└── styles/           # Global styles

./supabase/
├── migrations/       # Database migrations (YYYYMMDDHHmmss_description.sql format)
└── config.toml      # Supabase configuration

./.ai_docs/          # Architecture and planning documentation
├── api-plan.md      # REST API specification
├── db-plan.md       # Database schema documentation
└── prd.md          # Product requirements
```

## Architecture & Key Concepts

### Multi-Tenant Workspace System

The application uses a workspace-based multi-tenancy model:

- **Workspaces** are the primary data isolation unit (tenant)
- Each user belongs to one or more workspaces via `workspace_members` junction table
- All data (locations, boxes, QR codes) is scoped to a workspace
- Access control enforced via PostgreSQL Row Level Security (RLS)
- Helper function: `is_workspace_member(workspace_id)` validates access in RLS policies

### Hierarchical Locations

Locations use PostgreSQL's `ltree` extension for hierarchical storage:

- Maximum depth: 5 levels (e.g., Garage > Metal Rack > Top Shelf > Left Section > Box Area)
- Stored as paths (e.g., `root.garage.metalrack.topshelf`)
- Supports soft delete with automatic box unlinking
- GiST indexing for efficient tree operations

### QR Code System

Two types of IDs:

- **QR Codes:** Format `QR-XXXXXX` (6 uppercase alphanumeric, e.g., `QR-A1B2C3`)
- **Box Short IDs:** 10 character alphanumeric (e.g., `X7K9P2mN4q`)

QR code lifecycle:

1. Batch generate QR codes with status `generated`
2. When assigned to a box, status becomes `assigned`
3. When box deleted, QR resets to `generated` for reuse (via database trigger)

### Full-Text Search

Boxes have auto-updating `search_vector` (tsvector) generated from:

- Box name
- Description
- Tags array

Indexed with GIN for efficient full-text queries.

## Database Migrations

**Location:** `supabase/migrations/`

**Naming Convention:** `YYYYMMDDHHmmss_short_description.sql` (UTC timestamp)

**Example:** `20241213120000_create_profiles.sql`

**Guidelines:**

- All SQL must be lowercase
- Include header comments with migration purpose
- Always enable RLS on new tables
- Create granular RLS policies (separate policies for select/insert/update/delete per role)
- Use `moddatetime` extension for `updated_at` triggers
- Add copious comments for destructive operations

See `.ai_docs/db-plan.md` for complete schema documentation.

## API Endpoints (Astro SSR)

API routes live in `src/pages/api/` and follow REST conventions.

**Key Patterns:**

- Use uppercase method handlers: `export async function GET(context)`, `export async function POST(context)`
- Disable prerendering: `export const prerender = false`
- Validate input with Zod schemas
- Extract business logic to `src/lib/services/`
- Access Supabase via `context.locals.supabase` (set by middleware)
- Return responses using `new Response(JSON.stringify(data), { status: 200 })`

See `.ai_docs/api-plan.md` for complete API specification.

## Supabase Integration

**Client Access:**

- In API routes: Use `context.locals.supabase` (injected by middleware)
- In components: Import from `src/db/supabase.client.ts`
- Type imports: Use `SupabaseClient` type from `src/db/supabase.client.ts`, NOT from `@supabase/supabase-js`

**Database Types:**

- Auto-generated in `src/db/database.types.ts`
- Entity types and DTOs should be defined in `src/types.ts` for frontend/backend sharing

**Authentication:**

- Handled by Supabase Auth (GoTrue)
- JWT tokens in `Authorization: Bearer <token>` header
- Middleware validates session and attaches user to `context.locals`

## React Component Patterns

- **Static content:** Use `.astro` components
- **Interactive UI:** Use React components with Astro integration
- Never use `"use client"` directive (that's Next.js specific)
- Custom hooks go in `src/components/hooks/`
- Use `React.memo()`, `useCallback()`, `useMemo()` for optimization
- Leverage `useOptimistic()` for optimistic UI updates
- Use `useId()` for accessibility IDs

## Code Quality & Style

**Error Handling:**

- Handle errors and edge cases at the beginning of functions
- Use early returns to avoid nested conditionals
- Place happy path last for readability
- Log errors appropriately and return user-friendly messages

**Astro Specific:**

- Use View Transitions API for smooth page navigation
- Use `Astro.cookies` for server-side cookie management
- Access environment variables via `import.meta.env`
- Prefer SSR over SSG for authenticated routes

**Tailwind:**

- Use Tailwind 4 syntax
- Leverage `dark:` variant for dark mode
- Use responsive variants (`sm:`, `md:`, `lg:`)
- Arbitrary values with square brackets for one-offs (`w-[123px]`)

## Accessibility

- Use semantic HTML first, ARIA attributes when necessary
- Implement ARIA landmarks (main, navigation, search)
- Use `aria-label`, `aria-labelledby`, `aria-describedby` appropriately
- Set `aria-expanded` and `aria-controls` for expandable content
- Use `aria-live` regions for dynamic content updates
- Avoid redundant ARIA on semantic elements

## Testing & Linting

- Run `npm run lint` before commits (enforced by Husky pre-commit hook)
- Lint-staged automatically fixes `.ts`, `.tsx`, `.astro` files
- ESLint configuration in `eslint.config.js`
- Prettier configuration in `.prettierrc.json`

## Important References

- **Database Schema:** `.ai_docs/db-plan.md`
- **API Specification:** `.ai_docs/api-plan.md`
- **Product Requirements:** `.ai_docs/prd.md`
- **Tech Stack Details:** `.ai_docs/tech-stack.md`

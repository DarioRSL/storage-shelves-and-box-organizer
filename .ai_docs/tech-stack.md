# Tech Stack - Storage & Box Organizer

**Last Updated:** January 11, 2026
**Status:** ✅ **Production-Ready**
**Node Version:** 22.14.0 (LTS)
**Package Manager:** npm

## Technology Stack Summary

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| **Frontend Framework** | Astro | 5.x | ✅ SSR configured |
| **UI Library** | React | 19.x | ✅ Full integration |
| **Language** | TypeScript | 5.x | ✅ Strict mode |
| **Styling** | Tailwind CSS | 4.x | ✅ OKLCH colors |
| **Component Library** | Shadcn/ui | Latest | ✅ Radix UI |
| **State Management** | Nano Stores | Latest | ✅ Lightweight |
| **Backend** | Supabase | Latest | ✅ PostgreSQL + Auth |
| **Database** | PostgreSQL | 15.x | ✅ RLS ready |
| **Validation** | Zod | Latest | ✅ Type-safe |
| **Package Manager** | npm | 10.x | ✅ Lock file |
| **Unit Testing** | Vitest | 1.x | 🔄 Planned |
| **E2E Testing** | Playwright | 1.x | 🔄 Planned |
| **API Testing** | Supertest | Latest | 🔄 Planned |
| **Coverage** | Codecov | Latest | 🔄 Planned |

## Frontend Framework

- **Astro 5** - Static Site Generation + Server-Side Rendering
  - Uses `@astrojs/node` adapter for SSR
  - Server-side middleware for authentication
  - File-based routing with dynamic segments

- **React 19** - Interactive UI Components
  - Astro integration for component hydration
  - Custom hooks for data management
  - Optimized rendering with React.memo, useCallback, useMemo

- **TypeScript 5** - Type Safety
  - Strict mode enabled
  - Auto-generated types from Supabase schema
  - Zod schemas for runtime validation

- **Tailwind CSS 4** - Styling
  - Mobile-first responsive design
  - Dark mode support via `dark:` prefix (class-based strategy)
  - Arbitrary values with square brackets
  - OKLCH color space for perceptually uniform colors
  - CSS variables for semantic theming

- **Shadcn/ui** - Component Library
  - Unstyled, accessible components
  - Built on Radix UI primitives
  - Full Tailwind CSS integration

- **Nano Stores** - State Management
  - Lightweight alternative to Redux
  - Simple reactive stores for global state
  - Used for dashboard state, user context

## Backend & Infrastructure

- **Supabase (PostgreSQL + Auth)** - Backend-as-a-Service
  - PostgreSQL database with Row Level Security (RLS)
  - Built-in authentication (GoTrue)
  - Real-time subscriptions (optional future feature)
  - Recommended extensions:
    - `uuid-ossp` - UUID generation
    - `ltree` - Hierarchical data (locations)
    - `moddatetime` - Auto-update timestamps
    - `pg_trgm` - Fuzzy text search (optional)

- **PostgREST** - Auto-generated REST API
  - Automatic endpoint generation from PostgreSQL schema
  - Limitation: Doesn't support ltree operators (see LOCATION_SERVICE_OPTIMIZATION.md)
  - Workaround: In-memory filtering in JavaScript

## Authentication & Security

### HttpOnly Cookie-Based Sessions (PR #62)

- **Mechanism:** Secure HTTP-only cookies instead of Authorization headers
- **Benefits:**
  - ✅ XSS Protection (JavaScript cannot access cookies)
  - ✅ CSRF Protection (SameSite=Strict)
  - ✅ Automatic cookie transmission
- **Implementation:**
  - `POST /api/auth/session` - Establishes session
  - Middleware extracts cookie from request headers
  - Fallback JWT decoding if Supabase unavailable
- **Documentation:** See AUTHENTICATION_ARCHITECTURE.md

### Multi-Layer Authorization

1. **Application Layer** - Middleware validates user from cookies
2. **Database Layer** - PostgreSQL RLS policies enforce access control
3. **API Layer** - Endpoints validate user and business rules
4. **Service Layer** - Business logic validation

### Row Level Security (RLS)

- All tables have RLS enabled
- Helper function: `is_workspace_member(workspace_id)`
- Automatic filtering based on authenticated user
- Prevents direct database access without authorization

## Additional Libraries

### Data & Validation

- **Zod** - Runtime schema validation
  - Validates request bodies, query parameters
  - Polish error messages
  - Type inference for TypeScript

- **@supabase/supabase-js** - Supabase client SDK
  - Server-side (SSR) and client-side usage
  - Automatic cookie management
  - RLS enforcement through auth context

### UI & UX

- **react-qr-code / qrcode.react** - QR Code generation
  - Client-side QR generation
  - SVG and canvas rendering options

- **lucide-react** - Icon library
  - Consistent, accessible icons
  - Integrated with Shadcn/ui

### Utilities

- **cookie** - Parse HTTP cookies
  - Used in middleware for session extraction
  - Handles cookie format and encoding

- **csv-stringify** - CSV export
  - Inventory export functionality
  - Configurable formatting options

## CI/CD & Deployment

- **GitHub Actions** - Continuous Integration
  - Automated testing (planned)
  - Linting and formatting checks
  - Build verification

- **DigitalOcean (Recommended)** - Hosting
  - App Platform for Astro deployment
  - PostgreSQL managed database
  - Automatic SSL certificates

## Testing & Quality Assurance

### Testing Frameworks

- **Vitest 1.x** - Unit & Integration Testing
  - Native Vite integration for fast execution
  - TypeScript support out of the box
  - Snapshot testing and mocking capabilities
  - Coverage reporting with c8 or istanbul
  - Use cases: Service layer, utilities, validation logic
  - Target: 80% code coverage

- **Playwright 1.x** - End-to-End Testing
  - Cross-browser support (Chrome, Firefox, Safari, Edge)
  - Mobile device emulation
  - Network throttling and offline testing
  - Parallel test execution
  - Auto-waiting and video/screenshot capture
  - Use cases: Critical user workflows, visual regression

- **Supertest** - API Testing
  - Express-style API endpoint testing
  - Integrates seamlessly with Vitest
  - Chainable assertions for HTTP requests
  - Cookie and session handling
  - Use cases: REST endpoint validation

### Testing Tools & Coverage

- **c8 / Istanbul** - Code coverage tools
  - Integrated with Vitest
  - HTML and LCOV report generation
  - Coverage thresholds enforcement

- **Codecov** - Coverage reporting
  - Tracks coverage trends over time
  - PR integration for coverage diffs
  - Team dashboards

### Security Testing

- **OWASP ZAP** - Automated vulnerability scanning
  - OWASP Top 10 coverage
  - CI/CD integration support
  - Free and open source

- **Burp Suite Community Edition** - Manual security testing
  - Proxy interception for request inspection
  - Request tampering for security validation
  - Penetration testing workflows

### Performance Testing

- **Artillery 2.x** - Load testing
  - Scenario-based API load testing
  - Real-time metrics and reporting
  - Support for complex user flows

- **Lighthouse** - Frontend performance auditing
  - Core Web Vitals measurement (FCP, LCP, CLS, TTI)
  - Progressive Web App validation
  - Built into Chrome DevTools

- **k6 (Grafana)** - Advanced load testing
  - JavaScript-based test scripting
  - Real-time dashboards
  - Scalability testing

### Accessibility Testing

- **axe DevTools** - Automated WCAG checks
  - Browser extension for real-time audits
  - WCAG 2.1 Level AA compliance validation
  - Detailed remediation guidance

- **WAVE** - Visual accessibility audit
  - Color contrast analyzer
  - Structural markup review
  - Browser extension

- **Screen Readers**
  - NVDA (Windows) - Free, JAWS-compatible
  - VoiceOver (macOS) - Built-in system tool

### Database Testing

- **Supabase CLI** - Local development
  - Local PostgreSQL instance with Docker
  - Migration testing and validation
  - RLS policy testing in isolation

- **pgTAP** - Database unit testing
  - Unit tests for PostgreSQL functions
  - Trigger and constraint validation

- **pg_prove** - TAP test runner
  - Executes pgTAP test suites
  - CI/CD integration

## Development Tools

### Code Quality

- **ESLint** - Code linting
  - Configuration: eslint.config.js
  - Enforces code standards
  - Auto-fix on save

- **Prettier** - Code formatting
  - Configuration: .prettierrc.json
  - Consistent code style
  - Integrated with lint-staged

- **Husky** - Git hooks
  - Pre-commit hook runs lint-staged
  - Prevents commits with linting errors
  - Ensures code quality standards

### Package Management

- **npm** - Node package manager
  - Dependency lock file (package-lock.json)
  - Required Node.js version: 22.14.0 (specify in .nvmrc)
  - Use `nvm use` before development

## Database Schema Features

### Key PostgreSQL Extensions

1. **uuid-ossp** - UUID generation
   - Function: gen_random_uuid()
   - Used for all ID fields

2. **ltree** - Hierarchical paths
   - Location hierarchy (up to 5 levels deep)
   - Indexed with GIST
   - Note: PostgREST limitations led to JavaScript filtering approach

3. **moddatetime** - Automatic timestamp updates
   - Maintains `updated_at` on all record updates
   - Reduces manual trigger code

### Generated Columns & Triggers

- **search_vector** - Full-text search
  - Generated column on boxes table
  - Automatically updated from name, description, tags
  - Indexed with GIN for fast searches

- **short_id** - Unique identifiers
  - Box short_ids: 10-char alphanumeric (BEFORE INSERT trigger)
  - QR codes: QR-XXXXXX format (BEFORE INSERT trigger)

- **is_deleted** - Soft deletes
  - Locations use soft delete pattern
  - Preserves audit trail

## Architectural Patterns

### API Design

- **REST Architecture** - RESTful endpoints
- **Resource-Based URLs** - `/api/workspaces`, `/api/boxes`, etc.
- **Standard HTTP Methods** - GET, POST, PATCH, DELETE
- **Consistent Response Format** - JSON with error handling

### Error Handling

- **Zod Validation** - Input validation with schema
- **Custom Error Classes** - Domain-specific errors
- **Consistent Status Codes** - 400, 401, 403, 404, 409, 500
- **Polish Error Messages** - User-friendly localization

### State Management

- **Nano Stores** - Simple reactive state
- **Server State** - Context.locals for request-scoped data
- **Client State** - React hooks for component state

## Security Best Practices

✅ **OWASP Top 10 Addressed**
- A01: Broken Access Control - RLS + API validation
- A02: Cryptographic Failures - HTTPS + secure cookies
- A03: Injection - Supabase prepared statements
- A04: Insecure Design - Secure-by-default approach
- A05: Security Misconfiguration - RLS enabled by default
- A06: Vulnerable Components - Regular dependency updates
- A07: Authentication Failures - HttpOnly cookies + JWT fallback
- A08: Data Integrity - Dependency lock files
- A09: Logging & Monitoring - Error logging with context
- A10: SSRF - All external requests through vetted APIs

## Theme System Architecture

### Database-Backed Global Theme (PR #69)

**Implementation Date**: January 2, 2026

**Core Components**:

1. **Database Layer**:
   - Column: `profiles.theme_preference` (TEXT, CHECK constraint)
   - Valid values: 'light', 'dark', 'system'
   - Default: 'system'
   - Migration: `20260102182001_add_theme_preference_to_profiles.sql`

2. **API Layer**:
   - Endpoint: `PATCH /api/profiles/me/theme`
   - Validation: Zod schema
   - Authorization: RLS policy (user can only update own theme)

3. **Hook Layer** (`useTheme.ts`):
   - SSR support with `initialTheme` prop
   - Optimistic UI updates
   - Database persistence via API call
   - localStorage cache for fast repeat visits
   - System preference fallback

4. **SSR Integration**:
   - Theme fetched server-side in authenticated pages (`app.astro`, `settings.astro`)
   - Passed to Layout component as prop
   - `ThemeInitializer.astro` applies theme before React hydration (prevents FOUC)
   - Public pages (`index.astro`, `auth/index.astro`) use hardcoded 'light' theme

5. **Client-Side Application**:
   - Inline script in `<head>` applies theme synchronously
   - Priority: Database → localStorage → system preference
   - MediaQuery listener for system theme changes
   - Dark mode toggle via class on `<html>` element

**Color System**:
- **Color Space**: OKLCH (perceptually uniform, better for interpolation)
- **Semantic Tokens**: `--background`, `--foreground`, `--card`, `--border`, etc.
- **Tailwind Integration**: `bg-background`, `text-foreground`, `border-border`
- **Dark Mode Adjustment**: Lightened by ~10% based on user feedback (January 2, 2026)
  - Background: 0.21 → 0.25 lightness (+19%)
  - Card: 0.25 → 0.30 (+20%)
  - Muted: 0.30 → 0.35 (+17%)

**Benefits**:
- ✅ Cross-device theme sync (database-backed)
- ✅ Zero FOUC (server-side theme application)
- ✅ Optimistic UI (instant feedback)
- ✅ Graceful degradation (localStorage fallback)
- ✅ System preference respect

**Implementation Files**:
- `src/components/hooks/useTheme.ts` - React hook
- `src/components/theme/ThemeInitializer.astro` - SSR theme script
- `src/components/settings/ThemeToggle.tsx` - UI component (Polish i18n)
- `src/pages/api/profiles/me/theme.ts` - API endpoint
- `src/styles/global.css` - Theme color definitions

## Performance Considerations

- **Query Optimization**
  - Single efficient queries (no N+1 problems)
  - Indexes on foreign keys and search vectors
  - In-memory filtering for hierarchical data (see LOCATION_SERVICE_OPTIMIZATION.md)

- **Caching**
  - Browser caching for static assets
  - Client-side cache in Nano Stores
  - Theme localStorage cache (fast repeat visits)
  - Future: Redis for server-side caching

- **Code Splitting**
  - Astro automatically splits code per route
  - React lazy loading for components
  - Minimal JavaScript sent to client

## Documentation References

- **Architecture:** See CLAUDE.md for project overview
- **Authentication:** See AUTHENTICATION_ARCHITECTURE.md for security details
- **Location System:** See LOCATION_SERVICE_OPTIMIZATION.md for hierarchy implementation
- **API Specification:** See api-plan.md for all endpoints
- **Database Schema:** See db-plan.md for tables and relationships
- **Testing Strategy:** See tests/TEST_PLAN.md for comprehensive test plan

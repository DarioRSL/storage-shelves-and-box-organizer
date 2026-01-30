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

# Testing
npm run test             # Run all unit/integration tests
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:e2e         # Run E2E tests with Playwright
npm run test:watch       # Watch mode for TDD
npm run test:coverage    # Generate coverage report

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

## Testing

**Test Framework:** Vitest (unit/integration), Playwright (E2E), Supertest (API)

**Location:** `tests/` directory

**Structure:**

- `tests/unit/` - Unit tests for services, utilities, validation logic
- `tests/integration/` - API integration tests with Supertest
- `tests/e2e/` - End-to-end tests with Playwright (Chromium only)
- `tests/fixtures/` - Test data and fixtures
- `tests/helpers/` - Test utilities and helper functions
- `tests/setup.ts` - Global Vitest setup

**Guidelines:** Follow `.claude/commands/guideline_testing.md` for:

- Vitest: Use `vi` object for mocks/spies, factory patterns, inline snapshots
- Playwright: Chromium only, Page Object Model, browser contexts for isolation
- Supertest: async/await, test database setup/teardown with beforeEach/afterEach

**Coverage Target:** 80% (lines, functions, branches, statements)

See `tests/README.md` for complete testing documentation and `tests/QUICK_REFERENCE.md` for quick command reference.

# AI Rules for {{project-name}}

{{project-description}}

## FRONTEND

### Guidelines for ASTRO

#### ASTRO_CODING_STANDARDS

- Use Astro components (.astro) for static content and layout
- Implement framework components in {{framework_name}} only when interactivity is needed
- Leverage View Transitions API for smooth page transitions
- Use content collections with type safety for blog posts, documentation, etc.
- Implement middleware for request/response modification
- Use image optimization with the Astro Image integration
- Leverage Server Endpoints for API routes
- Implement hybrid rendering with server-side rendering where needed
- Use Astro.cookies for server-side cookie management
- Leverage import.meta.env for environment variables

#### ASTRO_ISLANDS

- Use client:visible directive for components that should hydrate when visible in viewport
- Implement shared state with nanostores instead of prop drilling between islands
- Use content collections for type-safe content management of structured content
- Leverage client:media directive for components that should only hydrate at specific breakpoints
- Implement partial hydration strategies to minimize JavaScript sent to the client
- Use client:only for components that should never render on the server
- Leverage client:idle for non-critical UI elements that can wait until the browser is idle
- Implement client:load for components that should hydrate immediately
- Use Astro's transition:\* directives for view transitions between pages
- Leverage props for passing data from Astro to framework components

### Guidelines for STYLING

#### TAILWIND

- Use the @layer directive to organize styles into components, utilities, and base layers
- Implement Just-in-Time (JIT) mode for development efficiency and smaller CSS bundles
- Use arbitrary values with square brackets (e.g., w-[123px]) for precise one-off designs
- Leverage the @apply directive in component classes to reuse utility combinations
- Implement the Tailwind configuration file for customizing theme, plugins, and variants
- Use component extraction for repeated UI patterns instead of copying utility classes
- Leverage the theme() function in CSS for accessing Tailwind theme values
- Implement dark mode with the dark: variant
- Use responsive variants (sm:, md:, lg:, etc.) for adaptive designs
- Leverage state variants (hover:, focus:, active:, etc.) for interactive elements

#### STYLED_COMPONENTS

- Use the ThemeProvider for consistent theming across components
- Implement the css helper for sharing styles between components
- Use props for conditional styling within template literals
- Leverage the createGlobalStyle for global styling
- Implement attrs method to pass HTML attributes to the underlying DOM elements
- Use the as prop for dynamic component rendering
- Leverage styled(Component) syntax for extending existing components
- Implement the css prop for one-off styling needs
- Use the & character for nesting selectors
- Leverage the keyframes helper for animations

### Guidelines for ACCESSIBILITY

#### MOBILE_ACCESSIBILITY

- Ensure touch targets are at least 44 by 44 pixels for comfortable interaction on mobile devices
- Implement proper viewport configuration to support pinch-to-zoom and prevent scaling issues
- Design layouts that adapt to both portrait and landscape orientations without loss of content
- Support both touch and keyboard navigation for hybrid devices with {{input_methods}}
- Ensure interactive elements have sufficient spacing to prevent accidental activation
- Test with mobile screen readers like VoiceOver (iOS) and TalkBack (Android)
- Design forms that work efficiently with on-screen keyboards and autocomplete functionality
- Implement alternatives to complex gestures that require fine motor control
- Ensure content is accessible when device orientation is locked for users with fixed devices
- Provide alternatives to motion-based interactions for users with vestibular disorders

#### ACCESSIBILITY_TESTING

- Test keyboard navigation to verify all interactive elements are operable without a mouse
- Verify screen reader compatibility with NVDA, JAWS, and VoiceOver for {{critical_user_journeys}}
- Use automated testing tools like Axe, WAVE, or Lighthouse to identify common accessibility issues
- Check color contrast using tools like Colour Contrast Analyzer for all text and UI components
- Test with page zoomed to 200% to ensure content remains usable and visible
- Perform manual accessibility audits using WCAG 2.2 checklist for key user flows
- Test with voice recognition software like Dragon NaturallySpeaking for voice navigation
- Validate form inputs have proper labels, instructions, and error handling mechanisms
- Conduct usability testing with disabled users representing various disability types
- Implement accessibility unit tests for UI components to prevent regression

#### ARIA

- Use ARIA landmarks to identify regions of the page (main, navigation, search, etc.)
- Apply appropriate ARIA roles to custom interface elements that lack semantic HTML equivalents
- Set aria-expanded and aria-controls for expandable content like accordions and dropdowns
- Use aria-live regions with appropriate politeness settings for dynamic content updates
- Implement aria-hidden to hide decorative or duplicative content from screen readers
- Apply aria-label or aria-labelledby for elements without visible text labels
- Use aria-describedby to associate descriptive text with form inputs or complex elements
- Implement aria-current for indicating the current item in a set, navigation, or process
- Avoid redundant ARIA that duplicates the semantics of native HTML elements
- Apply aria-invalid and appropriate error messaging for form validation in {{form_validation}}

#### WCAG_UNDERSTANDABLE

- Specify the human language of the page and any language changes using lang attributes
- Ensure components with the same functionality have consistent identification and behavior across {{application_sections}}
- Provide clear labels, instructions, and error messages for user inputs and {{form_elements}}
- Implement error prevention for submissions with legal or financial consequences (confirmation, review, undo)
- Make navigation consistent across the site with predictable patterns for menus and interactive elements
- Ensure that receiving focus or changing settings does not automatically trigger unexpected context changes
- Design context-sensitive help for complex interactions including validated input formats
- Use clear language and define unusual terms, abbreviations, and jargon for {{domain_specific_content}}
- Provide visual and programmatic indication of current location within navigation systems

#### WCAG_OPERABLE

- Make all functionality accessible via keyboard with visible focus indicators for {{interactive_elements}}
- Avoid keyboard traps where focus cannot move away from a component via standard navigation
- Provide mechanisms to extend, adjust, or disable time limits if present in {{timed_interactions}}
- Avoid content that flashes more than three times per second to prevent seizure triggers
- Implement skip navigation links to bypass blocks of repeated content across pages
- Use descriptive page titles, headings, and link text that indicate purpose and destination
- Ensure focus order matches the visual and logical sequence of information presentation
- Support multiple ways to find content (search, site map, logical navigation hierarchy)
- Allow pointer gesture actions to be accomplished with a single pointer without path-based gestures
- Implement pointer cancellation to prevent unintended function activation, especially for {{critical_actions}}

## CODING_PRACTICES

### Guidelines for DOCUMENTATION

#### DOC_UPDATES

- Update relevant documentation in /docs when modifying features
- Keep README.md in sync with new capabilities
- Maintain changelog entries in CHANGELOG.md

#### SWAGGER

- Define comprehensive schemas for all request and response objects
- Use semantic versioning in API paths to maintain backward compatibility
- Implement detailed descriptions for endpoints, parameters, and {{domain_specific_concepts}}
- Configure security schemes to document authentication and authorization requirements
- Use tags to group related endpoints by resource or functional area
- Implement examples for all endpoints to facilitate easier integration by consumers

### Guidelines for STATIC_ANALYSIS

#### PRETTIER

- Define a consistent .prettierrc configuration across all {{project_repositories}}
- Configure editor integration to format on save for immediate feedback
- Use .prettierignore to exclude generated files, build artifacts, and {{specific_excluded_patterns}}
- Set printWidth based on team preferences (80-120 characters) to improve code readability
- Configure consistent quote style and semicolon usage to match team conventions
- Implement CI checks to ensure all committed code adheres to the defined style

#### CODECOV

- Set minimum coverage thresholds for {{critical_code_paths}} to ensure adequate testing
- Configure path-specific coverage targets based on risk assessment
- Use coverage flags to categorize tests (unit, integration, e2e) for better reporting
- Implement coverage checks in CI/CD pipelines to prevent coverage regression
- Configure branch coverage in addition to line coverage for more thorough analysis
- Set up pull request comments to highlight coverage changes during review

#### ESLINT

- Configure project-specific rules in eslint.config.js to enforce consistent coding standards
- Use shareable configs like eslint-config-airbnb or eslint-config-standard as a foundation
- Implement custom rules for {{project_specific_patterns}} to maintain codebase consistency
- Configure integration with Prettier to avoid rule conflicts for code formatting
- Use the --fix flag in CI/CD pipelines to automatically correct fixable issues
- Implement staged linting with husky and lint-staged to prevent committing non-compliant code

### Guidelines for ARCHITECTURE

#### ADR

- Create ADRs in /docs/adr/{name}.md for:
- 1. Major dependency changes
- 2. Architectural pattern changes
- 3. New integration patterns
- 4. Database schema changes

#### CLEAN_ARCHITECTURE

- Strictly separate code into layers: entities, use cases, interfaces, and frameworks
- Ensure dependencies point inward, with inner layers having no knowledge of outer layers
- Implement domain entities that encapsulate {{business_rules}} without framework dependencies
- Use interfaces (ports) and implementations (adapters) to isolate external dependencies
- Create use cases that orchestrate entity interactions for specific business operations
- Implement mappers to transform data between layers to maintain separation of concerns

#### DDD

- Define bounded contexts to separate different parts of the domain with clear boundaries
- Implement ubiquitous language within each context to align code with business terminology
- Create rich domain models with behavior, not just data structures, for {{core_domain_entities}}
- Use value objects for concepts with no identity but defined by their attributes
- Implement domain events to communicate between bounded contexts
- Use aggregates to enforce consistency boundaries and transactional integrity

#### MICROSERVICES

- Design services around business capabilities rather than technical functions
- Implement API gateways to handle cross-cutting concerns for {{client_types}}
- Use event-driven communication for asynchronous operations between services
- Implement circuit breakers to handle failures gracefully in distributed systems
- Design for eventual consistency in data that spans multiple services
- Implement service discovery and health checks for robust system operation

### Guidelines for VERSION_CONTROL

#### GITHUB

- Use pull request templates to standardize information provided for code reviews
- Implement branch protection rules for {{protected_branches}} to enforce quality checks
- Configure required status checks to prevent merging code that fails tests or linting
- Use GitHub Actions for CI/CD workflows to automate testing and deployment
- Implement CODEOWNERS files to automatically assign reviewers based on code paths
- Use GitHub Projects for tracking work items and connecting them to code changes

#### GITHUB ACTION Rules

- Check if `package.json` exists in project root and summarize key scripts
- Check if `.nvmrc` exists in project root
- Check if `.env.example` exists in project root to identify key `env:` variables
- Always use `git branch -a | cat` to verify whether we use `main` or `master` branch
- Always use `env:` variables and secrets attached to jobs instead of global workflows
- Always use `npm ci` for Node-based dependency setup
- Extract common steps into composite actions in separate files
- Once you're done, as a final step conduct the following:

1. For each public action always use <tool>"Run Terminal"</tool> to see what is the most up-to-date version (use only major version):

```bash
curl -s https://api.github.com/repos/{owner}/{repo}/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([0-9]+).*/\1/'
```

2. (Ask if needed) Use <tool>"Run Terminal"</tool> to fetch README.md and see if we're not using any deprecated actions by mistake:

```bash
curl -s https://raw.githubusercontent.com/{owner}/{repo}/refs/tags/v{TAG_VERSION}/README.md
```

3. (Ask if needed) Use <tool>"Run Terminal"</tool> to fetch repo metadata and see if we're not using any deprecated actions by mistake:

```bash
curl -s https://api.github.com/repos/{owner}/{repo} | grep '"archived":'
```

4. (Ask if needed) In case of linter issues related to action parameters, try to fetch action description directly from GitHub and use the following command:

```bash
curl -s https://raw.githubusercontent.com/{owner}/{repo}/refs/heads/{main/master}/action.yml
```

# Test Plan for Storage & Box Organizer

**Version:** 1.0
**Last Updated:** January 11, 2026
**Project Status:** Post-MVP (71% Complete - 25/35 stories)
**Target Phase:** Pre-Production & Post-MVP Testing

---

## 1. Testing Scope

### 1.1 In Scope

**MVP Features (100% Complete - Regression Testing Required):**

- ✅ Email/Password authentication and session management
- ✅ HttpOnly cookie-based authentication system
- ✅ Workspace creation and management
- ✅ Hierarchical location structure (5 levels deep with ltree)
- ✅ Box CRUD operations (create, read, update, delete)
- ✅ QR code batch generation system
- ✅ QR code assignment and lifecycle management
- ✅ Live search functionality (full-text search with tsvector)
- ✅ Box filtering by location
- ✅ Location soft delete with box unlinking
- ✅ Multi-tenant workspace isolation (RLS policies)

**Critical Pre-Production Testing (US-036, US-037):**

- 🔴 Row Level Security (RLS) policy verification
- 🔴 Multi-user data isolation testing
- 🔴 Workspace member authorization
- 🔴 Structured logging system (Winston)
- 🔴 Log sanitization (no PII, passwords, or sensitive data)

**Post-MVP Features (Planned for Phase 2):**

- Password reset flow via email
- Account deletion with RODO compliance
- Export to CSV functionality
- OAuth integration (Google, Apple)
- Dark mode functionality
- Mobile-optimized UI

**Cross-Cutting Concerns:**

- Security testing (OWASP Top 10 compliance)
- Performance testing (load, stress, scalability)
- Accessibility testing (WCAG 2.1 AA compliance)
- Browser compatibility testing
- Mobile device testing (PWA functionality)
- API endpoint testing (14 REST endpoints)
- Database integrity and RLS enforcement

### 1.2 Out of Scope

**Explicitly Excluded from MVP (per PRD):**

- Offline mode functionality
- Photo upload and image optimization
- Native mobile app testing (iOS/Android stores)
- Email delivery testing (no SMTP in MVP)
- Payment processing and subscriptions
- Activity logs and audit trails
- Collaborative workspace features (prepared but not implemented)

**Technical Limitations:**

- PostgREST ltree operator testing (known limitation, JavaScript fallback implemented)
- Real-time subscriptions (Supabase feature deferred)

---

## 2. Testing Types

### 2.1 Unit Testing

**Scope:** Individual functions, utilities, and business logic in isolation.

**Focus Areas:**

- **Validation Logic** (`src/lib/validation/`)
  - Zod schema validation for all API endpoints
  - Polish error message generation
  - Edge case handling (empty strings, special characters, SQL injection attempts)

- **Service Layer** (`src/lib/services/`)
  - `workspaceService.ts` - Workspace CRUD operations
  - `locationService.ts` - Hierarchical location operations (ltree path building)
  - `boxService.ts` - Box management with full-text search
  - `qrCodeService.ts` - QR code generation and lifecycle
  - `profileService.ts` - User profile management and theme preferences

- **Utility Functions** (`src/lib/api/client.ts`)
  - API client error handling
  - HTTP status code mapping
  - Request/response transformations

**Coverage Target:** 80% code coverage for service layer and validation logic

**Testing Framework:** Vitest (fast, Vite-native, TypeScript support)

### 2.2 Integration Testing

**Scope:** Interactions between application layers and external services.

**Focus Areas:**

- **API Endpoint Testing** (14 REST endpoints in `src/pages/api/`)
  - Authentication endpoints (`POST /api/auth/session`, `DELETE /api/auth/session`)
  - Workspace endpoints (`GET /api/workspaces`, `POST /api/workspaces`)
  - Location endpoints (`GET /api/locations`, `POST /api/locations`, `PATCH /api/locations/[id]`, `DELETE /api/locations/[id]`)
  - Box endpoints (`GET /api/boxes`, `POST /api/boxes`, `GET /api/boxes/[id]`, `PATCH /api/boxes/[id]`, `DELETE /api/boxes/[id]`)
  - QR code endpoints (`POST /api/qr-codes/batch`, `GET /api/qr-codes/available`)
  - Profile endpoints (`GET /api/profiles/me`, `PATCH /api/profiles/me/theme`)

- **Database Integration**
  - Supabase client authentication flow
  - CRUD operations with RLS enforcement
  - Full-text search queries (tsvector/tsquery)
  - Hierarchical queries (ltree operations)
  - Soft delete behavior
  - Trigger execution (short_id generation, search_vector updates)

- **Middleware Integration**
  - Cookie parsing and session extraction
  - JWT validation and fallback decoding
  - User context injection (`context.locals.user`)
  - Authenticated Supabase client setup

**Testing Framework:** Vitest + Supertest (HTTP assertions)

### 2.3 End-to-End (E2E) Testing

**Scope:** Complete user workflows from UI to database.

**Critical User Journeys:**

1. **Authentication Flow**
   - User registration with email/password
   - Login with valid credentials
   - Login failure with invalid credentials
   - Session persistence across page refreshes
   - Logout and session cleanup

2. **QR Code Workflow**
   - Generate batch of QR codes (20 codes)
   - Print QR codes to PDF
   - Scan empty QR code (mobile simulation)
   - Create box from scanned QR
   - Assign QR to manually created box
   - Scan assigned QR to view box details

3. **Box Management Workflow**
   - Create box with name, description, tags
   - Assign box to location
   - Edit box details
   - Move box to different location
   - Search for box by name/description/tags
   - Delete box and verify QR code reset

4. **Location Management Workflow**
   - Create root location (Garage)
   - Create nested location (Garage > Metal Rack)
   - Create 5-level deep hierarchy
   - Edit location name
   - Soft delete location with boxes
   - Verify boxes moved to "Unassigned"

5. **Search and Discovery**
   - Live search with 3+ characters
   - Filter boxes by location
   - View search results with breadcrumbs
   - Clear search and return to full list

**Testing Framework:** Playwright (cross-browser, mobile simulation, network throttling)

### 2.4 Security Testing

**Scope:** Verification of OWASP Top 10 protections and RLS policies.

**Focus Areas:**

1. **Authentication & Authorization**
   - HttpOnly cookie security (XSS protection)
   - CSRF protection (SameSite=Strict)
   - JWT token validation and expiration
   - Session hijacking attempts
   - Brute force protection

2. **Row Level Security (RLS) - CRITICAL (US-036)**
   - Multi-user isolation testing
   - Workspace member access control
   - Cross-workspace data leakage prevention
   - Direct database query blocking without auth
   - `is_workspace_member()` function validation
   - `auth.uid()` context in policies

3. **Input Validation**
   - SQL injection attempts (Supabase prepared statements)
   - XSS attacks (React auto-escaping + validation)
   - Path traversal in location hierarchy
   - Maximum depth enforcement (5 levels)
   - Character encoding attacks

4. **API Security**
   - Unauthorized access attempts (401 responses)
   - Forbidden resource access (403 responses)
   - Rate limiting (future consideration)
   - CORS policy verification

5. **Data Sanitization**
   - Log sanitization (no PII, passwords, JWT tokens)
   - Error message safety (no stack traces in production)
   - Database field constraints

**Testing Tools:** OWASP ZAP, Burp Suite Community, custom scripts

### 2.5 Performance Testing

**Scope:** Application responsiveness, scalability, and resource usage.

**Test Scenarios:**

1. **Load Testing**
   - 50 concurrent users accessing dashboard
   - 100 simultaneous search queries
   - Batch QR code generation (100 codes)
   - Large location hierarchy (500+ locations)
   - Large box inventory (1000+ boxes)

2. **Stress Testing**
   - 200+ concurrent users
   - Rapid-fire API requests (10 req/sec per user)
   - Database connection pool exhaustion
   - Memory leak detection (long-running sessions)

3. **Database Performance**
   - Full-text search on 10,000+ boxes
   - Hierarchical queries with deep nesting
   - GIN/GiST index effectiveness
   - Query execution time (<200ms for searches)

4. **Frontend Performance**
   - First Contentful Paint (FCP) <1.5s
   - Time to Interactive (TTI) <3.0s
   - Largest Contentful Paint (LCP) <2.5s
   - Cumulative Layout Shift (CLS) <0.1
   - React component render performance

**Performance Targets:**

- API response time: <200ms (p95)
- Page load time: <3s (3G network)
- Search response: <500ms (10,000 boxes)
- QR generation: <2s (20 codes)

**Testing Tools:** Artillery (load testing), Lighthouse (frontend), k6 (API stress testing)

### 2.6 Accessibility Testing

**Scope:** WCAG 2.1 Level AA compliance (US-049).

**Focus Areas:**

1. **Keyboard Navigation**
   - Tab order logical and complete
   - Focus indicators visible (3px outline)
   - Enter/Space activates buttons
   - Arrow keys navigate LocationTree
   - Escape closes modals/dropdowns

2. **Screen Reader Support**
   - ARIA labels on icon buttons
   - ARIA landmarks (main, navigation, search)
   - ARIA live regions for dynamic content
   - Form labels and error associations
   - LocationTree aria-expanded states

3. **Visual Accessibility**
   - Color contrast ratio 4.5:1 (normal text)
   - Color contrast ratio 3:1 (large text)
   - No information conveyed by color alone
   - Text resizable to 200%
   - Focus indicators clear and visible

4. **Responsive Design**
   - Mobile-first layout (320px minimum width)
   - Touch target size 44x44px minimum
   - Pinch-to-zoom enabled
   - Viewport meta tag configured

**Testing Tools:** axe DevTools, WAVE, NVDA (Windows), VoiceOver (macOS), Lighthouse

### 2.7 Compatibility Testing

**Scope:** Browser, device, and platform compatibility.

**Browser Matrix:**

- **Desktop:** Chrome 120+, Firefox 120+, Safari 17+, Edge 120+
- **Mobile:** Chrome Android 120+, Safari iOS 17+
- **Testing:** Latest 2 major versions of each browser

**Device Matrix:**

- **Mobile:** iPhone 12/13/14/15, Samsung Galaxy S21/S22/S23
- **Tablet:** iPad Air, iPad Pro, Samsung Galaxy Tab
- **Desktop:** 1920x1080, 1366x768, 2560x1440

**PWA Testing:**

- Add to Home Screen functionality
- Offline fallback page
- Service worker registration
- Manifest.json validation

**Testing Tools:** BrowserStack, Sauce Labs, manual device testing

### 2.8 Regression Testing

**Scope:** Ensure existing MVP functionality remains intact after changes.

**Critical Regression Suites:**

- Authentication and session management
- QR code lifecycle (generate → assign → scan → delete → reset)
- Location hierarchy and soft delete
- Box CRUD operations
- Search functionality
- RLS policy enforcement
- Theme preferences (dark/light mode)

**Execution Frequency:** After every deployment, automated in CI/CD

**Testing Approach:** Automated E2E test suite (Playwright)

---

## 3. Testing Tools and Frameworks

### 3.1 Test Frameworks

#### Unit & Integration Testing

**Primary:** Vitest 1.x

- **Rationale:** Native Vite integration, faster than Jest, TypeScript support
- **Use Cases:** Service layer, utilities, validation logic
- **Features:** Snapshot testing, mocking, coverage reports

**Alternative Consideration:** Jest (if team has existing expertise)

#### End-to-End Testing

**Primary:** Playwright 1.x

- **Rationale:** Cross-browser support, mobile emulation, network control
- **Use Cases:** Critical user workflows, visual regression
- **Features:** Parallel execution, auto-waiting, video/screenshot capture

**Alternative Consideration:** Cypress (if real-time debugging is priority)

#### API Testing

**Primary:** Supertest + Vitest

- **Rationale:** Express-style API testing, integrates with Vitest
- **Use Cases:** REST endpoint testing, request/response validation
- **Features:** Chainable assertions, cookie handling

### 3.2 Security Testing Tools

**OWASP ZAP (Free)**

- Automated vulnerability scanning
- OWASP Top 10 coverage
- CI/CD integration

**Burp Suite Community Edition**

- Manual security testing
- Proxy interception
- Request tampering

**Custom RLS Testing Scripts**

- Supabase client with different user contexts
- Direct SQL query validation
- Automated multi-user scenario testing

### 3.3 Performance Testing Tools

**Artillery 2.x**

- Load testing for API endpoints
- Scenario-based testing
- Real-time metrics

**Lighthouse (Chrome DevTools)**

- Frontend performance auditing
- Core Web Vitals measurement
- Progressive Web App checks

**k6 (Grafana)**

- Advanced load testing
- Scripting in JavaScript
- Real-time dashboards

### 3.4 Accessibility Testing Tools

**axe DevTools (Browser Extension)**

- Automated WCAG checks
- Real-time issue detection
- Detailed remediation guidance

**WAVE (Browser Extension)**

- Visual accessibility audit
- Color contrast analyzer
- Structural markup review

**Screen Readers:**

- **NVDA** (Windows) - Free, JAWS-compatible
- **VoiceOver** (macOS) - Built-in

### 3.5 CI/CD Integration Tools

**GitHub Actions** (Already in use)

- Automated test execution
- Linting and formatting checks
- Build verification

**Test Coverage Tools:**

- **Vitest Coverage** (c8 or istanbul)
- **Codecov** (coverage reporting and tracking)

### 3.6 Database Testing Tools

**Supabase CLI** (Local development)

- Local PostgreSQL instance
- Migration testing
- RLS policy testing

**PostgreSQL Testing:**

- **pgTAP** - Unit tests for database functions
- **pg_prove** - TAP test runner

### 3.7 Monitoring and Logging

**Winston Logger** (Already implemented - US-037)

- Structured logging
- Daily log rotation
- Sanitized output (no PII)

**Sentry** (Recommended for production)

- Error tracking
- Performance monitoring
- User session replay

---

## 4. Test Environment

### 4.1 Environment Strategy

**Three-Tier Approach:**

1. **Development Environment** (`localhost:3000`)
   - Local Astro dev server (`npm run dev`)
   - Supabase local instance (Docker via Supabase CLI)
   - Hot module reloading
   - Debug mode enabled

2. **Staging Environment** (Pre-production)
   - Deployed to DigitalOcean App Platform
   - Separate Supabase project (staging)
   - Production-like configuration
   - Full test suite execution

3. **Production Environment**
   - Live application
   - Production Supabase project
   - Smoke tests only (minimal disruption)
   - Real-time monitoring

### 4.2 Test Data Strategy

**Data Seeding:**

- **Script Location:** `supabase/seed.sql` (to be created)
- **Seed Data:**
  - 3 test users (user1@test.com, user2@test.com, admin@test.com)
  - 2 workspaces per user
  - 10 locations per workspace (3 levels deep)
  - 50 boxes per workspace
  - 100 QR codes (50 assigned, 50 available)

**Test Data Cleanup:**

- Automated cleanup after E2E tests
- Isolated test workspaces
- Database reset scripts

**Production-Like Data:**

- Staging environment mirrors production schema
- Performance testing uses 10,000+ box dataset
- Anonymized production data export (optional)

### 4.3 Environment Configuration

**Environment Variables:**

```bash
# Development
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=<local_anon_key>
NODE_ENV=development

# Staging
PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<staging_anon_key>
NODE_ENV=staging

# Production
PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<prod_anon_key>
NODE_ENV=production
```

**Database Requirements:**

- PostgreSQL 15.x
- Extensions: `uuid-ossp`, `ltree`, `moddatetime`, `pg_trgm`
- RLS enabled on all tables
- Test database size: 1GB minimum

**Infrastructure Requirements:**

- **Development:** Local machine (8GB RAM, 4 cores minimum)
- **Staging:** DigitalOcean App Platform (Basic tier)
- **CI/CD:** GitHub Actions runners (2GB RAM per runner)

### 4.4 Browser/Device Lab

**Physical Devices:**

- iPhone 14 (iOS 17)
- Samsung Galaxy S23 (Android 14)
- iPad Air (iPadOS 17)
- MacBook Pro (macOS Sonoma)
- Windows 11 Desktop

**Cloud Testing:**

- BrowserStack (cross-browser testing)
- Sauce Labs (mobile device testing)

---

## 5. Test Strategy

### 5.1 Testing Pyramid

```
         /\
        /E2E\        (10% - Critical user journeys)
       /------\
      /Integration\ (30% - API + DB + Services)
     /------------\
    /    Unit      \ (60% - Business logic + Validation)
   /----------------\
```

**Rationale:**

- Unit tests are fast, isolated, and provide immediate feedback
- Integration tests validate layer interactions
- E2E tests are slow but verify real user workflows

### 5.2 Risk-Based Testing Approach

**High-Risk Areas (Priority 1):**

- 🔴 **RLS Policies** (US-036) - Data leakage prevention
- 🔴 **Authentication System** - HttpOnly cookies, JWT validation
- 🔴 **Multi-Tenant Isolation** - Workspace data segregation
- 🔴 **QR Code Lifecycle** - Uniqueness, assignment, reset logic
- 🔴 **Soft Delete** - Location deletion with box unlinking

**Medium-Risk Areas (Priority 2):**

- 🟡 **Search Functionality** - Full-text search accuracy
- 🟡 **Hierarchical Locations** - ltree path integrity
- 🟡 **API Endpoints** - Input validation, error handling
- 🟡 **Performance** - Large dataset scalability

**Low-Risk Areas (Priority 3):**

- 🟢 **UI Components** - Visual styling, layout
- 🟢 **Theme Toggle** - Dark/light mode switching
- 🟢 **Logging** - Winston structured logging

### 5.3 Test Execution Strategy

**Continuous Testing:**

- Unit tests run on every file save (Vitest watch mode)
- Integration tests run on every commit (Git hooks)
- E2E tests run on every PR (GitHub Actions)
- Full test suite runs nightly (Scheduled CI)

**Manual Testing:**

- Exploratory testing for new features
- Usability testing with real users
- Accessibility testing with assistive technologies
- Security testing for critical vulnerabilities

**Defect Management:**

- **Blocker:** Prevents release (RLS failure, auth bypass)
- **Critical:** Major functionality broken (search fails, QR duplicate)
- **Major:** Feature partially broken (soft delete incomplete)
- **Minor:** Cosmetic or edge case (UI misalignment)

### 5.4 Test Coverage Goals

**Code Coverage Targets:**

- **Service Layer:** 80% line coverage
- **API Endpoints:** 90% line coverage (high risk)
- **Validation Logic:** 100% line coverage (critical)
- **UI Components:** 60% line coverage (lower priority)

**Functional Coverage:**

- **MVP User Stories:** 100% coverage (all 24 stories)
- **Critical Workflows:** 100% coverage (auth, QR, search)
- **Edge Cases:** 80% coverage (error handling, boundaries)

### 5.5 Test Documentation

**Test Case Management:**

- Test cases stored in `.ai_docs/tests/test-cases/` (markdown format)
- Organized by feature area
- Include preconditions, steps, expected results
- Linked to user stories (US-XXX)

**Test Results:**

- CI/CD pipeline generates HTML reports
- Coverage reports published to Codecov
- Failed tests notify team via Slack/Email

---

## 6. Test Cases

### 6.1 Authentication & Authorization

**TC-AUTH-001: User Registration**

- **Precondition:** User not registered
- **Steps:** Enter email/password, submit form
- **Expected:** User created, workspace auto-created, redirected to /app
- **Priority:** High

**TC-AUTH-002: Login with Valid Credentials**

- **Precondition:** User exists
- **Steps:** Enter valid email/password, submit
- **Expected:** Session cookie set, redirected to /app
- **Priority:** High

**TC-AUTH-003: Login with Invalid Credentials**

- **Precondition:** User exists
- **Steps:** Enter invalid password
- **Expected:** Error message "Nieprawidłowy e-mail lub hasło"
- **Priority:** High

**TC-AUTH-004: Session Persistence**

- **Precondition:** User logged in
- **Steps:** Refresh page
- **Expected:** User remains logged in, no redirect to /auth
- **Priority:** Medium

**TC-AUTH-005: Logout**

- **Precondition:** User logged in
- **Steps:** Click "Wyloguj" button
- **Expected:** Session cleared, redirected to /login
- **Priority:** High

**TC-AUTH-006: HttpOnly Cookie Security**

- **Precondition:** User logged in
- **Steps:** Attempt to access `document.cookie` via DevTools
- **Expected:** `sb_session` cookie not visible to JavaScript
- **Priority:** Critical

### 6.2 Row Level Security (RLS) - US-036

**TC-RLS-001: Workspace Data Isolation**

- **Precondition:** Two users (A, B) in different workspaces
- **Steps:** User A queries boxes, User B queries boxes
- **Expected:** Each user sees only their workspace data
- **Priority:** Critical

**TC-RLS-002: Cross-Workspace Data Leakage**

- **Precondition:** Two users in different workspaces
- **Steps:** User A attempts to query User B's box by ID
- **Expected:** 403 Forbidden or empty result
- **Priority:** Critical

**TC-RLS-003: Workspace Member Access**

- **Precondition:** User A is member of Workspace X
- **Steps:** User A queries locations in Workspace X
- **Expected:** All locations returned
- **Priority:** High

**TC-RLS-004: Non-Member Access Denial**

- **Precondition:** User A is NOT member of Workspace Y
- **Steps:** User A attempts to query Workspace Y data
- **Expected:** Empty result or 403 Forbidden
- **Priority:** Critical

**TC-RLS-005: `auth.uid()` Context**

- **Precondition:** User logged in
- **Steps:** Execute query with RLS policy checking `auth.uid()`
- **Expected:** Policy correctly identifies user
- **Priority:** Critical

**TC-RLS-006: Direct Database Query Blocking**

- **Precondition:** Attacker has database credentials
- **Steps:** Attempt direct SQL query without auth context
- **Expected:** Query blocked by RLS, no data returned
- **Priority:** Critical

### 6.3 QR Code Management

**TC-QR-001: Batch Generation**

- **Precondition:** User logged in
- **Steps:** Navigate to /app/qr-generator, enter 20, submit
- **Expected:** 20 QR codes generated with status "generated"
- **Priority:** High

**TC-QR-002: QR Code Uniqueness**

- **Precondition:** 100 QR codes generated
- **Steps:** Query database for duplicate `qr_code` values
- **Expected:** All QR codes unique
- **Priority:** Critical

**TC-QR-003: QR Code Assignment**

- **Precondition:** Empty QR code exists
- **Steps:** Create box and assign QR
- **Expected:** QR status changes to "assigned"
- **Priority:** High

**TC-QR-004: Scan Empty QR Code**

- **Precondition:** QR code generated but unassigned
- **Steps:** Scan QR with mobile device
- **Expected:** Redirect to /app/boxes/new?qr_id=XXX
- **Priority:** High

**TC-QR-005: Scan Assigned QR Code**

- **Precondition:** QR assigned to Box A
- **Steps:** Scan QR
- **Expected:** Redirect to /app/boxes/[box_id]
- **Priority:** High

**TC-QR-006: QR Reset on Box Delete**

- **Precondition:** Box with assigned QR
- **Steps:** Delete box
- **Expected:** QR status reset to "generated", reusable
- **Priority:** High

**TC-QR-007: QR Code Format Validation**

- **Precondition:** QR generation trigger
- **Steps:** Generate QR codes
- **Expected:** All QR codes match format `QR-[A-Z0-9]{6}`
- **Priority:** Medium

### 6.4 Location Hierarchy

**TC-LOC-001: Create Root Location**

- **Precondition:** User logged in
- **Steps:** Create location "Garage" with no parent
- **Expected:** Location created with path "root.garage"
- **Priority:** High

**TC-LOC-002: Create Nested Location**

- **Precondition:** Root location "Garage" exists
- **Steps:** Create location "Metal Rack" under "Garage"
- **Expected:** Location created with path "root.garage.metalrack"
- **Priority:** High

**TC-LOC-003: Maximum Depth Enforcement**

- **Precondition:** 5-level hierarchy exists
- **Steps:** Attempt to create 6th level
- **Expected:** Error "Maximum depth of 5 levels exceeded"
- **Priority:** Medium

**TC-LOC-004: Edit Location Name**

- **Precondition:** Location "Regał A" exists
- **Steps:** Edit name to "Regał Metalowy"
- **Expected:** Name updated, path regenerated
- **Priority:** Medium

**TC-LOC-005: Soft Delete Location**

- **Precondition:** Location with 3 boxes
- **Steps:** Delete location
- **Expected:** Location marked `is_deleted=true`, boxes moved to "Unassigned"
- **Priority:** High

**TC-LOC-006: Soft Delete Location Without Boxes**

- **Precondition:** Empty location
- **Steps:** Delete location
- **Expected:** Location marked deleted, no boxes affected
- **Priority:** Medium

### 6.5 Box Management

**TC-BOX-001: Create Box**

- **Precondition:** User logged in
- **Steps:** Fill name, description, tags, location, submit
- **Expected:** Box created with short_id, search_vector generated
- **Priority:** High

**TC-BOX-002: Create Box with QR**

- **Precondition:** Available QR code exists
- **Steps:** Create box and assign QR
- **Expected:** Box created, QR assigned
- **Priority:** High

**TC-BOX-003: Edit Box Details**

- **Precondition:** Box exists
- **Steps:** Update name, description, tags
- **Expected:** Box updated, search_vector regenerated
- **Priority:** High

**TC-BOX-004: Move Box to Different Location**

- **Precondition:** Box in Location A
- **Steps:** Edit box, change location to Location B
- **Expected:** Box location_id updated
- **Priority:** Medium

**TC-BOX-005: Delete Box**

- **Precondition:** Box with assigned QR
- **Steps:** Delete box
- **Expected:** Box deleted, QR reset to "generated"
- **Priority:** High

**TC-BOX-006: View Box Details**

- **Precondition:** Box exists
- **Steps:** Navigate to /app/boxes/[id]
- **Expected:** Name, description, tags, location, QR code displayed
- **Priority:** Medium

**TC-BOX-007: Box Short ID Generation**

- **Precondition:** Create new box
- **Steps:** Submit box creation
- **Expected:** short_id auto-generated (10 alphanumeric chars)
- **Priority:** Medium

### 6.6 Search Functionality

**TC-SEARCH-001: Live Search Activation**

- **Precondition:** Dashboard loaded
- **Steps:** Type 3 characters in search bar
- **Expected:** Search results appear
- **Priority:** High

**TC-SEARCH-002: Search by Box Name**

- **Precondition:** Box named "Narzędzia" exists
- **Steps:** Search "Narzędzia"
- **Expected:** Box returned in results
- **Priority:** High

**TC-SEARCH-003: Search by Description**

- **Precondition:** Box description contains "śrubokręty"
- **Steps:** Search "śrubokręty"
- **Expected:** Box returned in results
- **Priority:** High

**TC-SEARCH-004: Search by Tags**

- **Precondition:** Box tagged "elektronika"
- **Steps:** Search "elektronika"
- **Expected:** Box returned in results
- **Priority:** High

**TC-SEARCH-005: Search by Location Name**

- **Precondition:** Box in "Garaż" location
- **Steps:** Search "Garaż"
- **Expected:** All boxes in Garaż returned
- **Priority:** Medium

**TC-SEARCH-006: Clear Search**

- **Precondition:** Active search with results
- **Steps:** Click "X" button
- **Expected:** Search cleared, full list restored
- **Priority:** Low

**TC-SEARCH-007: No Results Handling**

- **Precondition:** Search term doesn't match any data
- **Steps:** Search "nonexistent"
- **Expected:** "Brak pudełek spełniających kryteria" message
- **Priority:** Medium

**TC-SEARCH-008: Full-Text Search Performance**

- **Precondition:** 10,000 boxes in database
- **Steps:** Perform search
- **Expected:** Results returned in <500ms
- **Priority:** Medium

### 6.7 Theme Management

**TC-THEME-001: Toggle Dark Mode**

- **Precondition:** Light mode active
- **Steps:** Click theme toggle
- **Expected:** Dark mode activated, saved to database
- **Priority:** Low

**TC-THEME-002: Theme Persistence**

- **Precondition:** Dark mode saved
- **Steps:** Logout, login
- **Expected:** Dark mode restored
- **Priority:** Low

**TC-THEME-003: System Theme Preference**

- **Precondition:** Theme set to "system"
- **Steps:** Change OS theme
- **Expected:** App theme follows OS
- **Priority:** Low

### 6.8 API Endpoint Testing

**TC-API-001: GET /api/workspaces - Unauthorized**

- **Steps:** Request without session cookie
- **Expected:** 401 Unauthorized
- **Priority:** High

**TC-API-002: POST /api/boxes - Invalid Data**

- **Steps:** Send request with missing required fields
- **Expected:** 400 Bad Request with Zod error messages
- **Priority:** High

**TC-API-003: PATCH /api/locations/[id] - Non-Existent ID**

- **Steps:** Update location with invalid UUID
- **Expected:** 404 Not Found
- **Priority:** Medium

**TC-API-004: DELETE /api/boxes/[id] - Forbidden**

- **Steps:** User A attempts to delete User B's box
- **Expected:** 403 Forbidden (RLS enforcement)
- **Priority:** Critical

**TC-API-005: POST /api/qr-codes/batch - Range Validation**

- **Steps:** Request 150 QR codes (exceeds limit)
- **Expected:** 400 Bad Request "Maximum 100 codes per batch"
- **Priority:** Medium

---

## 7. Automation Strategy

### 7.1 Automation Scope

**Automate:**

- ✅ Unit tests (100% automated)
- ✅ Integration tests (100% automated)
- ✅ API endpoint tests (100% automated)
- ✅ Regression tests (90% automated)
- ✅ Smoke tests (100% automated)
- ✅ RLS policy tests (100% automated)
- ✅ Performance benchmarks (80% automated)

**Manual Testing:**

- ❌ Exploratory testing (new features)
- ❌ Usability testing (user feedback)
- ❌ Accessibility testing with screen readers (supplemental)
- ❌ Visual design review

### 7.2 CI/CD Pipeline Integration

**GitHub Actions Workflow:**

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22.14.0"
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres:15
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run supabase:start
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --production
      - run: npm run security:scan # OWASP ZAP baseline scan
```

**Pipeline Gates:**

- All tests must pass before merge to `main`
- Code coverage must be ≥75%
- No critical security vulnerabilities
- ESLint passes with 0 errors

### 7.3 Test Automation Tools

**Unit & Integration Tests:**

- **Framework:** Vitest
- **Execution:** `npm run test:unit`, `npm run test:integration`
- **Watch Mode:** `npm run test:watch`
- **Coverage:** `npm run test:coverage`

**E2E Tests:**

- **Framework:** Playwright
- **Execution:** `npm run test:e2e`
- **Headed Mode:** `npm run test:e2e:headed`
- **Debug Mode:** `npm run test:e2e:debug`
- **Parallel:** 4 workers (configurable)

**API Tests:**

- **Framework:** Supertest + Vitest
- **Execution:** `npm run test:api`
- **Isolation:** Separate test database

**RLS Tests:**

- **Framework:** Vitest + Supabase client
- **Execution:** `npm run test:rls`
- **Approach:** Create multiple user contexts, verify isolation

### 7.4 Test Data Management

**Strategy:** Factory Pattern + Database Seeding

**Test Factories:**

```typescript
// tests/factories/userFactory.ts
export function createUser(overrides = {}) {
  return {
    email: `user-${Date.now()}@test.com`,
    password: "TestPass123!",
    ...overrides,
  };
}

// tests/factories/boxFactory.ts
export function createBox(overrides = {}) {
  return {
    name: `Test Box ${Date.now()}`,
    description: "Test description",
    tags: ["test", "automation"],
    workspace_id: "...",
    ...overrides,
  };
}
```

**Cleanup Strategy:**

- Teardown after each test suite
- Isolated test workspaces
- Database transactions (rollback after test)

### 7.5 Test Reporting

**Reports Generated:**

- **HTML Report:** Vitest UI (`npm run test:ui`)
- **JUnit XML:** CI/CD integration
- **Coverage Report:** HTML + LCOV format
- **Playwright Report:** HTML with screenshots/videos

**Dashboard:**

- Codecov for coverage trends
- GitHub Actions for test history
- Custom dashboard (optional): Allure Report

---

## 8. Timeline and Resources

### 8.1 Testing Phases

#### Phase 0: Pre-Production Critical Testing (Week 1-2)

**Objective:** Ensure production-ready security and stability

**Activities:**

- ✅ Enable and verify RLS policies (US-036) - **2 hours**
- ✅ Multi-user isolation testing - **4 hours**
- ✅ Verify Winston logging (US-037) - **1 hour**
- ✅ Security audit (OWASP Top 10) - **8 hours**
- ✅ Regression testing (MVP features) - **6 hours**

**Deliverables:**

- RLS test suite (100% coverage)
- Security audit report
- Pre-production sign-off

**Resources:** 1 QA Engineer, 1 Developer

**Status:** **MANDATORY** - Blocks production deployment

---

#### Phase 1: Test Infrastructure Setup (Week 3-4)

**Objective:** Establish testing foundation and tooling

**Activities:**

- Set up Vitest for unit/integration tests - **4 hours**
- Configure Playwright for E2E tests - **6 hours**
- Create test factories and utilities - **8 hours**
- Set up CI/CD pipeline (GitHub Actions) - **6 hours**
- Database seeding scripts - **4 hours**
- Test environment configuration - **4 hours**

**Deliverables:**

- Test framework configured
- CI/CD pipeline operational
- Test data seeding automated

**Resources:** 1 QA Engineer, 1 DevOps Engineer

---

#### Phase 2: Core Test Suite Development (Week 5-8)

**Objective:** Achieve 80% test coverage for MVP features

**Activities:**

- Unit tests for service layer (6 services) - **20 hours**
- Integration tests for API endpoints (14 endpoints) - **24 hours**
- E2E tests for critical workflows (5 journeys) - **30 hours**
- RLS policy tests (6 test cases) - **12 hours**
- Search functionality tests (8 test cases) - **8 hours**

**Deliverables:**

- 150+ unit tests
- 50+ integration tests
- 25+ E2E tests
- 80% code coverage

**Resources:** 2 QA Engineers, 1 Developer (part-time)

---

#### Phase 3: Non-Functional Testing (Week 9-10)

**Objective:** Validate performance, security, and accessibility

**Activities:**

- Performance testing (load, stress) - **16 hours**
- Security testing (penetration, vulnerability scan) - **12 hours**
- Accessibility testing (WCAG 2.1 AA) - **12 hours**
- Browser/device compatibility testing - **8 hours**
- PWA functionality testing - **4 hours**

**Deliverables:**

- Performance benchmark report
- Security audit report
- Accessibility audit report
- Compatibility matrix

**Resources:** 1 QA Engineer (specialized), 1 Performance Engineer

---

#### Phase 4: Regression & Maintenance (Ongoing)

**Objective:** Maintain test suite and prevent regressions

**Activities:**

- Update tests for new features - **4 hours/week**
- Fix flaky tests - **2 hours/week**
- Review test coverage - **1 hour/week**
- Update test documentation - **1 hour/week**

**Deliverables:**

- Stable test suite (>95% pass rate)
- Up-to-date test documentation

**Resources:** 1 QA Engineer (20% allocation)

---

### 8.2 Resource Requirements

#### Team Composition

**QA Engineers (2 FTE for 10 weeks):**

- Test strategy and planning
- Test case development
- Test automation (Vitest, Playwright)
- Manual exploratory testing
- Bug tracking and reporting

**Developers (0.5 FTE for 10 weeks):**

- Test infrastructure setup
- Complex integration test scenarios
- RLS policy test implementation
- Performance test scripting

**DevOps Engineer (0.25 FTE for 10 weeks):**

- CI/CD pipeline configuration
- Test environment provisioning
- Database seeding automation

**Security Specialist (0.1 FTE for 2 weeks):**

- Penetration testing
- Security audit review
- OWASP compliance verification

#### Hardware/Software

**Development Machines:**

- 2 laptops (macOS or Windows, 16GB RAM, SSD)
- 2 mobile devices (iPhone, Android)

**Cloud Services:**

- BrowserStack subscription ($99/month)
- DigitalOcean staging environment ($20/month)
- Codecov Pro ($10/month)

**Testing Tools:**

- Playwright (free)
- Vitest (free)
- OWASP ZAP (free)
- axe DevTools Pro ($120/year)

**Total Budget Estimate:** $2,500 (3-month period)

---

### 8.3 Milestones and Success Criteria

**Milestone 1: Pre-Production Ready (Week 2)**

- ✅ All RLS policies enabled and tested
- ✅ Security audit complete (0 critical issues)
- ✅ Regression test suite passes
- **Gate:** Production deployment approved

**Milestone 2: Test Infrastructure Complete (Week 4)**

- ✅ CI/CD pipeline operational
- ✅ Test environments provisioned
- ✅ Test frameworks configured
- **Gate:** Ready for test development

**Milestone 3: 80% Test Coverage (Week 8)**

- ✅ 150+ unit tests written
- ✅ 50+ integration tests written
- ✅ 25+ E2E tests written
- ✅ Code coverage ≥80%
- **Gate:** MVP feature coverage complete

**Milestone 4: Non-Functional Testing Complete (Week 10)**

- ✅ Performance benchmarks established
- ✅ Security audit passed
- ✅ WCAG 2.1 AA compliance verified
- **Gate:** Production-ready certification

**Milestone 5: Continuous Testing Established (Week 12+)**

- ✅ Automated test suite runs on every PR
- ✅ <5% flaky test rate
- ✅ Test suite execution <15 minutes
- **Gate:** Sustainable testing practice

---

### 8.4 Risk Management

**Risk 1: RLS Policy Failures in Production**

- **Probability:** Low (with Phase 0 testing)
- **Impact:** Critical (data breach)
- **Mitigation:** Mandatory Phase 0 testing, production monitoring, canary deployments

**Risk 2: Flaky E2E Tests**

- **Probability:** Medium
- **Impact:** Low (CI/CD delays)
- **Mitigation:** Playwright auto-retry, explicit waits, quarantine flaky tests

**Risk 3: Limited Mobile Device Access**

- **Probability:** Medium
- **Impact:** Medium (PWA usability issues)
- **Mitigation:** BrowserStack subscription, borrow devices, beta tester program

**Risk 4: Test Maintenance Overhead**

- **Probability:** High
- **Impact:** Medium (test debt)
- **Mitigation:** Regular refactoring, shared test utilities, documentation

**Risk 5: Performance Regression**

- **Probability:** Medium
- **Impact:** Medium (user experience degradation)
- **Mitigation:** Continuous performance benchmarking, Lighthouse CI, database query optimization

---

## 9. Appendices

### 9.1 Test Execution Schedule

**Daily:**

- Unit tests on every commit (developer machines)
- Linting on every commit (pre-commit hook)

**Per Pull Request:**

- Full test suite (unit + integration + E2E)
- Code coverage check
- Security scan (npm audit)

**Nightly:**

- Full regression suite (all E2E tests)
- Performance benchmarks
- Database integrity checks

**Weekly:**

- Accessibility audit (axe scan)
- Browser compatibility checks
- Test suite review

**Pre-Release:**

- Full manual exploratory testing
- Security penetration testing
- Smoke tests on staging
- Production smoke tests post-deployment

### 9.2 Defect Tracking

**Tool:** GitHub Issues (already in use)

**Severity Levels:**

- **S1 - Blocker:** Production-blocking, security breach, data loss
- **S2 - Critical:** Major functionality broken, no workaround
- **S3 - Major:** Feature broken, workaround exists
- **S4 - Minor:** Cosmetic, edge case, low impact

**Priority Levels:**

- **P1:** Fix immediately (hotfix)
- **P2:** Fix in current sprint
- **P3:** Fix in next sprint
- **P4:** Backlog (nice-to-have)

**SLA:**

- S1/P1: Fix within 4 hours
- S2/P2: Fix within 2 days
- S3/P3: Fix within 1 week
- S4/P4: No SLA

### 9.3 Test Metrics

**Key Metrics to Track:**

- **Test Pass Rate:** Target >95%
- **Code Coverage:** Target ≥80%
- **Defect Density:** Target <2 defects per 1000 LOC
- **Test Execution Time:** Target <15 minutes (CI)
- **Flaky Test Rate:** Target <5%
- **Mean Time to Repair (MTTR):** Target <24 hours

**Dashboard Tools:**

- GitHub Actions (test results)
- Codecov (coverage trends)
- Custom dashboard (optional)

### 9.4 Exit Criteria

**Pre-Production (Phase 0):**

- ✅ All RLS tests passing (100%)
- ✅ Security audit passed (0 critical issues)
- ✅ Regression tests passing (100%)
- ✅ Logging verified (no PII leakage)

**MVP Release:**

- ✅ 80% code coverage achieved
- ✅ All critical test cases passing
- ✅ 0 blocker/critical defects open
- ✅ Performance benchmarks met
- ✅ Accessibility audit passed

**Post-MVP Releases:**

- ✅ All new feature tests passing
- ✅ Regression tests passing
- ✅ Code coverage maintained ≥80%
- ✅ No increase in defect density

---

## 10. Approval and Sign-Off

**Prepared By:** QA Lead
**Date:** January 11, 2026

**Reviewed By:**

- [ ] Product Owner - ********\_\_\_********
- [ ] Technical Lead - ********\_\_\_********
- [ ] Security Lead - ********\_\_\_********

**Approved By:**

- [ ] Project Manager - ********\_\_\_********
- [ ] CTO - ********\_\_\_********

**Version History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-11 | QA Lead | Initial test plan created |

---

## 11. References

- **Product Requirements:** `.ai_docs/prd.md`
- **Tech Stack:** `.ai_docs/tech-stack.md`
- **API Specification:** `.ai_docs/api-plan.md`
- **Database Schema:** `.ai_docs/db-plan.md`
- **Authentication Architecture:** `.ai_docs/AUTHENTICATION_ARCHITECTURE.md`
- **Project Roadmap:** `.ai_docs/ROADMAP.md`
- **User Stories:** `.ai_docs/prd.md` (Section 5)

---

**End of Test Plan**

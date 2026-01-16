# Storage & Box Organizer - Product Roadmap

**Last Updated:** 2026-01-06  
**Current Phase:** Documentation Consolidation → Security Hardening  
**Next Release:** v1.0.0 (Production Launch)  

---

## Table of Contents
1. [Project Status](#project-status)
2. [Milestone Overview](#milestone-overview)
3. [Critical Pre-Production Tasks](#critical-pre-production-tasks)
4. [Post-MVP Feature Backlog](#post-mvp-feature-backlog)
5. [Known Issues & Technical Debt](#known-issues--technical-debt)
6. [Release History](#release-history)

---

## 1. Project Status

### Current Metrics (as of 2026-01-06)

| Metric | Status | Target | Notes |
|--------|--------|--------|-------|
| MVP Features | ✅ 100% (24/24) | 24/24 | All user stories complete |
| API Endpoints | ✅ 100% (26/26) | 26/26 | Fully implemented |
| UI Views | ✅ 100% (7/7) | 7/7 | All pages built |
| ESLint Errors | ✅ 0 | 0 | Fixed in PR #87 |
| TypeScript | ✅ Passing | 0 errors | Clean build |
| **RLS Policies** | ❌ **0% (CRITICAL)** | 100% | **SECURITY BLOCKER** |
| Polish i18n | 🟡 ~70% | 100% | Minor gaps |
| Test Coverage | ❌ 0% | 70%+ | No automated tests |
| Accessibility | 🟡 85% | WCAG 2.1 AA | LocationTree keyboard nav pending |

**Production Readiness:** 85% (blocked by RLS policies)

---

## 2. Milestone Overview

### Milestone 0: Documentation Consolidation (Jan 6-10, 2026) ⚡ NEW
**Goal:** Organize project documentation for better maintainability  
**Duration:** 3-5 days (runs parallel to Security Hardening)  
**Status:** ⏳ IN PROGRESS  
**Tasks:** 7 issues  

**Key Deliverables:**
- ✅ Archive 71 historical files → ARCHIVE/
- ⏳ Create unified ROADMAP.md (this file)
- ⏳ Setup GitHub infrastructure (templates, labels, milestones, 43 issues)
- ⏳ Create CONTRIBUTING.md developer guide
- ⏳ Update cross-references in db-plan.md and CLAUDE.md

**Success Criteria:**
- 91 files → 15 active files (83% reduction)
- Single source of truth established
- Team onboarded to new documentation structure

---

### Milestone 1: Security Hardening (Jan 6-10, 2026)
**Goal:** Implement RLS policies for multi-tenant data isolation  
**Duration:** 3-5 days  
**Status:** ⏳ NOT STARTED  
**Blocking:** v1.0.0 Production Launch  
**Tasks:** 8 issues (RLS implementation, testing, quality gates)  

**Critical Tasks:**
1. **RLS Policies** - Implement for all 6 tables (workspaces, workspace_members, locations, boxes, qr_codes, profiles)
2. **Integration Tests** - Verify cross-workspace data isolation
3. **Polish Localization** - Complete remaining 30% (Box Form, Settings, error messages)
4. **Accessibility** - LocationTree keyboard navigation (WCAG 2.1 AA)

**Success Criteria:**
- All tables have RLS enabled
- Security audit passing (manual verification)
- Zero accessibility violations in critical paths
- 100% Polish UI

---

### Milestone 2: v1.0.0 Production Launch (Jan 13-20, 2026)
**Goal:** Deploy MVP to production with monitoring infrastructure  
**Duration:** 5-7 days  
**Status:** ⏳ BLOCKED (waiting for Milestone 1)  
**Dependencies:** RLS policies, staging environment, QA  
**Tasks:** 10 issues  

**Key Tasks:**
1. Setup production Supabase environment
2. Configure production env vars + error tracking (Sentry)
3. Create deployment runbook + rollback plan
4. Perform load testing on staging
5. Final QA on staging (all critical paths)
6. Deploy to production
7. Monitor 48-hour stability period

**Success Criteria:**
- Application live at production URL
- Zero critical errors in first 48 hours
- All critical workflows tested
- Uptime > 99% in first week
- Monitoring dashboards operational

---

### Milestone 3: Post-MVP Phase 1 (Jan 20 - Feb 10, 2026)
**Goal:** Address user feedback + implement high-impact features  
**Duration:** 2-3 weeks  
**Status:** ⏳ PLANNED  
**Tasks:** 6 issues  

**Features (Prioritized by User Impact):**
1. **Password Reset via Email** (HIGH priority) - 3-5 days
2. **CSV Export** (MEDIUM) - 2-3 days  
3. **Box Sorting & Filtering UI** (MEDIUM) - 3-4 days
4. **Dark Mode Theme Toggle** (LOW) - 2-3 days
5. **Toast Notification System** (MEDIUM) - 1-2 days
6. **Automated Testing Foundation** (MEDIUM) - 4-6 days

**Success Criteria:**
- At least 4 features shipped
- User satisfaction metrics improve
- Zero regression bugs in MVP features
- Test coverage ≥ 30%

---

### Milestone 4: Post-MVP Phase 2 (Feb - Mar 2026)
**Goal:** Implement advanced features for power users  
**Duration:** 4-6 weeks  
**Status:** ⏳ PLANNED  
**Tasks:** 12 issues  

**Features:**
1. OAuth (Google + Apple) - 6-8 days combined
2. Drag & Drop Location Reorganization - 5-7 days
3. Activity History / Audit Log - 5-7 days
4. Virtual Scrolling (performance) - 2-3 days
5. CSV Import - 4-6 days
6. Box Templates - 3-5 days
7. Advanced Permission Management - 5-7 days
8. Full WCAG 2.1 AA Compliance Audit - 6-8 days
9. Tag Filtering UI - 2-3 days
10. Box Duplication - 2-3 days
11. Mobile App (PWA Enhancements) - 7-10 days

**Success Criteria:**
- OAuth passes security audit
- Performance targets met for 1000+ boxes
- User retention stable or improving
- WCAG 2.1 AA certification achieved

---

## 3. Critical Pre-Production Tasks

### Task 1: RLS Policies Implementation ⚠️ CRITICAL

**Status:** ❌ NOT STARTED  
**Priority:** CRITICAL (Security Vulnerability)  
**Estimated:** 8-12 hours  
**Owner:** Backend/Database Team  

**Problem Statement:**

Currently, there are **ZERO RLS policies** in the database. Users can theoretically query data from ANY workspace, creating a critical security vulnerability for the multi-tenant system.

**Solution:**

Create migration: `supabase/migrations/20260106120000_enable_rls_policies.sql`

**Tables Requiring RLS:**
1. `workspaces` (4 policies: SELECT, INSERT, UPDATE, DELETE)
2. `workspace_members` (4 policies)
3. `locations` (4 policies)
4. `boxes` (4 policies)
5. `qr_codes` (4 policies)
6. `profiles` (2 policies: SELECT, UPDATE own profile)

**Policy Pattern Example:**
\`\`\`sql
-- Example for boxes table
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view boxes in their workspaces"
ON boxes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = boxes.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);
\`\`\`

**Testing Requirements:**
- Create 2 test users (User A, User B)
- Each user creates separate workspace
- Verify User A **CANNOT** read User B's boxes/locations/qr_codes
- Test via SQL queries and API endpoints
- Document test cases

**Acceptance Criteria:**
- [ ] Migration file created with 22+ policies
- [ ] RLS enabled on 6 tables
- [ ] Integration tests verify cross-workspace isolation
- [ ] API endpoints respect RLS (no code changes needed)
- [ ] Documentation updated in `db-plan.md`
- [ ] Security audit passing

**GitHub Issue:** #[TBD] - Implement RLS Policies for Multi-Tenant Security

---

### Task 2: Complete Polish Localization

**Status:** 🟡 70% COMPLETE  
**Priority:** HIGH  
**Estimated:** 4-6 hours  

**Remaining Gaps:**
- Box Form: Field labels (some English)
- Settings: Workspace member role names
- Error messages: Mixed Polish/English
- Validation messages: Inconsistent

**Solution:**
- Audit all UI components for English strings
- Create/extend translation map: `src/i18n/pl.json`
- Replace hardcoded strings with translation keys
- Test all views for consistency

**Acceptance Criteria:**
- [ ] 100% of UI text in Polish
- [ ] Error messages translated
- [ ] Consistent terminology (workspace = "obszar roboczy", box = "pudełko")
- [ ] No English strings visible in UI

**GitHub Issue:** #[TBD] - Complete Polish Localization (30% remaining)

---

### Task 3: LocationTree Keyboard Navigation

**Status:** 🟡 PARTIAL  
**Priority:** MEDIUM (Accessibility)  
**Estimated:** 3-4 hours  

**Current State:**
- ✅ Keyboard focus visible
- ✅ Basic ARIA roles
- ❌ Arrow key navigation (↑↓←→)
- ❌ Enter/Space to expand/collapse

**Solution:**
- Implement WAI-ARIA tree keyboard navigation pattern
- Add `onKeyDown` handlers to `LocationTreeNode.tsx`
- Test with keyboard only + screen reader

**Acceptance Criteria:**
- [ ] Arrow keys navigate tree structure
- [ ] Enter/Space expand/collapse nodes
- [ ] Focus visible and correct
- [ ] Screen reader announces node state
- [ ] Tab navigation follows logical order

**GitHub Issue:** #[TBD] - Improve LocationTree Keyboard Navigation (WCAG 2.1 AA)

---

## 4. Post-MVP Feature Backlog

### High Priority (User-Requested)

| Feature | User Story | Effort | Priority | Milestone |
|---------|-----------|--------|----------|-----------|
| Password Reset via Email | US-021 | 3-5 days | HIGH | Phase 1 |
| CSV Export | US-011 | 2-3 days | MEDIUM | Phase 1 |
| OAuth (Google/Apple) | US-022/023 | 5-7 days | HIGH | Phase 2 |

### Medium Priority (UX Improvements)

| Feature | User Story | Effort | Priority | Milestone |
|---------|-----------|--------|----------|-----------|
| Box Sorting & Filtering | - | 3-4 days | MEDIUM | Phase 1 |
| Tag Filtering UI | - | 2-3 days | MEDIUM | Phase 2 |
| Drag & Drop Locations | - | 5-7 days | MEDIUM | Phase 2 |
| Virtual Scrolling | - | 2-3 days | MEDIUM | Phase 2 |
| Toast Notifications | - | 1-2 days | MEDIUM | Phase 2 |

### Low Priority (Nice-to-Have)

| Feature | User Story | Effort | Priority | Milestone |
|---------|-----------|--------|----------|-----------|
| Dark Mode | - | 2-3 days | LOW | Phase 1 |
| Box Duplication | - | 2-3 days | LOW | Phase 2 |
| Box Templates | - | 3-5 days | LOW | Phase 2 |
| Activity History | - | 5-7 days | LOW | Phase 2 |

---

## 5. Known Issues & Technical Debt

### Security
- ❌ **CRITICAL:** No RLS policies (Milestone 1, Task 1)
- ✅ Authentication: HttpOnly cookies implemented
- ✅ CSRF: SameSite=Strict cookies
- 🟡 Dependency audit: Run `npm audit` quarterly

### Code Quality
- ✅ ESLint: 0 errors (resolved Jan 5, 2026 - PR #87)
- ✅ TypeScript: Clean compilation
- ✅ Logging: Winston production system (Jan 5, 2026)
- ❌ Test Coverage: 0% automated tests (need Jest + Testing Library)
- 🟡 Accessibility: 85% WCAG AA (LocationTree keyboard nav pending)

### Performance
- ✅ Build size: ~180KB gzipped (acceptable for MVP)
- 🟡 Large datasets: Works for ~100 boxes, needs virtual scrolling for 1000+
- ✅ Search: Debounced, PostgreSQL full-text search (fast)

### Documentation
- ✅ Documentation consolidated (Jan 6, 2026)
- ✅ API docs: Complete and accurate
- ✅ Database schema: Documented (needs RLS update)
- 🟡 Deployment runbook: Missing (create in Milestone 2)

---

## 6. Release History

### v0.9.0 - MVP Feature Complete (2026-01-02)

**Highlights:**
- ✅ All 24 MVP user stories implemented
- ✅ 26/26 API endpoints functional
- ✅ 7/7 UI views complete
- ✅ ESLint issues resolved (0 errors)
- ✅ Winston logging system implemented

**Key Commits:**
- `a235806` - Merge PR #87 (ESLint resolution session)
- `fc8a020` - Documentation updates (session review)
- `28e10f9` - QR code "Generate More" button UX enhancement
- `4d516bd` - QR batch generation in box form
- `e53a0a3` - React runtime warnings fixes (accessibility)

**Known Issues:**
- ❌ RLS policies not implemented (**CRITICAL BLOCKER**)
- 🟡 Test coverage 0%
- 🟡 Polish localization ~70%
- 🟡 Accessibility gaps (LocationTree keyboard nav)

---

### v1.0.0 - Production Launch (Target: 2026-01-20)

**Planned Features:**
- ✅ Row Level Security policies (all tables)
- ✅ 100% Polish localization
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ Production deployment (Supabase + hosting)
- ✅ Monitoring infrastructure (error tracking, logs, uptime)
- ✅ Deployment runbook
- ✅ Rollback plan

**Release Criteria:**
- All Milestone 1 & 2 tasks complete
- Security audit passing
- Zero critical bugs
- Uptime monitoring configured
- 48-hour production stability period

---

## Appendix: Documentation Structure

### Active Documentation (15 files)

\`\`\`
.ai_docs/
├── ROADMAP.md                          (this file - single source of truth)
├── prd.md                              (Product Requirements Document)
├── api-plan.md                         (API Specification)
├── db-plan.md                          (Database Schema)
├── tech-stack.md                       (Technology Stack)
├── CLAUDE.md                           (Project instructions for AI)
├── CONTRIBUTING.md                     (Developer onboarding guide)
├── review/
│   ├── MVP_STATUS_REPORT_2026_01_05.md
│   ├── ESLINT_RESOLUTION_SESSION_2026_01_05.md
│   └── BLOCKER_FIXES_CHECKLIST.md
└── ARCHIVE/                            (71 historical files)
    ├── README.md                       (Archive index)
    ├── implemented/ (33 files)
    ├── review/ (25 files)
    ├── testing/ (13 files)
    └── old-roadmaps/ (5 files)
\`\`\`

### GitHub Infrastructure

**Milestones:** 5 (Documentation + Security + Production + 2 Post-MVP phases)  
**Issues:** 43 total across all milestones  
**Labels:** 25 (priority, type, status, area, special)  
**Templates:** 4 (bug, feature, security, task)  

---

**For questions, refer to:**
- Technical architecture: `.ai_docs/CLAUDE.md`
- API specification: `.ai_docs/api-plan.md`
- Database schema: `.ai_docs/db-plan.md`
- Contribution workflow: `.ai_docs/CONTRIBUTING.md`

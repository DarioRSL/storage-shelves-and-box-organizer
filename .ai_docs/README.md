# .ai_docs Directory

This directory contains project documentation for the Storage & Box Organizer application.

## Active Documentation

### Core Planning Documents

- **ROADMAP.md** - Unified roadmap (single source of truth for project status)
- **prd.md** - Product Requirements Document
- **api-plan.md** - REST API Specification (26 endpoints)
- **db-plan.md** - Database Schema & PostgreSQL Features
- **tech-stack.md** - Technology Stack & Architecture Decisions

### Architecture & Implementation

- **CLAUDE.md** - Project overview for AI assistance (Claude Code)
- **AUTHENTICATION_ARCHITECTURE.md** - HttpOnly cookie-based auth system
- **LOCATION_SERVICE_OPTIMIZATION.md** - Hierarchical location system (ltree)
- **CONTRIBUTING.md** - Contribution Guidelines

### Testing & Quality Assurance

- **tests/TEST_PLAN.md** - Comprehensive test plan (unit, integration, E2E, security)
  - Testing frameworks: Vitest, Playwright, Supertest
  - Coverage targets: 80% code coverage
  - Security testing: OWASP Top 10, RLS validation
  - Performance testing: Artillery, Lighthouse, k6
  - Accessibility testing: axe DevTools, WCAG 2.1 AA

## Archive Structure

Historical documentation from MVP development phase (December 2025 - January 2026) is archived in `ARCHIVE/`:

- **implemented/** - Implementation plans for 26 API endpoints and core features (45 files)
- **review/** - Historical status reports and review documents (26 files)
- **testing/** - Manual testing scripts and guides (16 files)
- **old-roadmaps/** - Superseded roadmap versions (3 files: project-TO-DO, MVP_EN, MVP_PL)
- **ui-planning/** - UI planning session documents (1 file)

## Testing Technologies (New - January 2026)

### Core Testing Stack

- **Vitest 1.x** - Unit & integration testing (80% coverage target)
- **Playwright 1.x** - Cross-browser E2E testing with mobile emulation
- **Supertest** - API endpoint testing with Vitest integration

### Quality Assurance Tools

- **Coverage**: c8/Istanbul (code coverage), Codecov (reporting)
- **Security**: OWASP ZAP (automated), Burp Suite (manual)
- **Performance**: Artillery (load), Lighthouse (frontend), k6 (stress)
- **Accessibility**: axe DevTools, WAVE, NVDA, VoiceOver
- **Database**: Supabase CLI (local), pgTAP (unit tests), pg_prove (runner)

### CI/CD Integration

- **GitHub Actions** - Automated test execution on PRs
- **Test Phases**:
  - Phase 0: Pre-production critical testing (RLS, security)
  - Phase 1: Test infrastructure setup
  - Phase 2: Core test suite development (80% coverage)
  - Phase 3: Non-functional testing (performance, accessibility)
  - Phase 4: Ongoing regression & maintenance

See `tests/TEST_PLAN.md` for complete testing strategy.

## Archive Policy

Files are archived (not deleted) to preserve project history and decision context. All archived files remain accessible in git history.

**Last Updated:** 2026-01-17

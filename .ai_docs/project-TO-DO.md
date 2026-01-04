## MVP:
- security test 
- fix error toast vs inline errors
- simple logging based on winston
- simple tutorial at first logging in form at front

## Post MVP section:
- implematation of reset password functionality
- Mobile responsive optimization
- Dark mode - implemented
- OAuth (Google, Apple)
- Export to CSV
- Account deletion
- Password recovery
- implemet full logging with levels
- Better GUI layout
## Recent Completions:

### January 4, 2026 (Session 2):
- ✅ Dashboard Fixes & Improvements (Branch: fb_10xDevs_project)
  - Fixed workspace switching reliability (sequential → parallel execution with Promise.all)
  - Fixed box list loading state (no infinite spinner on empty workspace)
  - Added full box form navigation button ("Dodaj pudełko")
  - Renamed quick add button to "Szybkie dodanie" (future wizard/kreator)
  - Improved error handling with fallback mechanisms
  - ~40% faster workspace switching performance (250-400ms → 150-250ms)
  - Files: DashboardContainer.tsx, DashboardHeader.tsx, useBoxes.ts
  - Docs: `.ai_docs/implemented/dashboard-fixes-workspace-switching-implementation.md`

- ✅ QR Code Integration in Box Form (Branch: fb_10xDevs_project)
  - Created GET /api/qr-codes endpoint for workspace QR code listing
  - Implemented getQrCodesForWorkspace() service function
  - Added isWorkspaceMember() authorization helper
  - Integrated QR code loading in useBoxForm hook
  - Fixed QR code assignment validation in PATCH /api/boxes/:id
  - Added qr_code_id field to UpdateBoxSchema (Zod validation)
  - Fixed QR code assignment logic (separate qr_codes table update)
  - Fixed payload building to exclude undefined fields
  - Files: qr-codes/index.ts (NEW), qr-code.service.ts, box.validators.ts, useBoxForm.ts, box.service.ts
  - Docs: `.ai_docs/implemented/qr-codes-get-implementation-plan.md`

- ✅ Polish Character Support for Locations (Branch: fb_10xDevs_project)
  - Implemented transliteration for ltree compatibility (ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z)
  - Created transliteratePolish() and sanitizeForLtree() utilities
  - Modified location service to use transliteration on save
  - Enhanced breadcrumb display to show actual Polish names (last segment)
  - Capitalized intermediate segments for better readability
  - Supports all 9 Polish diacritics (lowercase + uppercase)
  - Backward compatible with existing locations (no migration needed)
  - Files: transliterate.ts (NEW), location.service.ts, LocationBreadcrumbs.tsx
  - Docs: `.ai_docs/implemented/polish-character-transliteration-implementation-plan.md`

### January 4, 2026 (Session 1):
- ✅ Box Form View Implementation (Branch: fb_ui-boxform-implememtation)
  - Complete CRUD form for creating and editing boxes
  - Location tree selector with lazy loading
  - QR code assignment capability
  - Delete functionality with confirmation dialog
  - Full Polish localization (Utwórz, Zapisz, Anuluj, Wyczyść, Usuń)
  - Fixed critical workspace ID propagation bug
  - Enhanced UX (Cancel→dashboard, Reset button, proper redirects)
  - 6 components modified: BoxForm, FormActions, LocationSelector, LocationTree, useBoxForm, Modal
  - Review: .ai_docs/review/box-form-view-implementation-review.md

### January 3, 2026:
- ✅ Box Details View Implementation (PR #81)
  - 9 React components + 1 Astro page
  - Full Polish UI (100% coverage)
  - QR code generation and printing
  - Comprehensive error handling
  - Dashboard integration (Szczegóły menu, Dodaj pudełko button)

# QA PRE-LAUNCH CHECKLIST
**Date:** 2025-12-31 | **Purpose:** Verify MVP readiness before production launch

---

## OVERVIEW

This checklist ensures all quality gates are passed before deploying to production. Use this document throughout Phase 6 (Testing & Polish) and Phase 7 (Deployment).

**Status Tracking:**
- ❌ = Not done / Failing
- 🟡 = In progress / Partially done
- ✅ = Complete / Passing

---

## 1. CODE QUALITY GATES

### 1.1 Linting & Formatting

```bash
# Command to verify
npm run lint
npm run format
```

**Checklist:**

| Item | Status | Notes |
|------|--------|-------|
| ESLint errors | ❌ | Target: 0 errors (currently 73) |
| ESLint warnings | ❌ | Target: 0 warnings (currently 185) |
| Prettier formatting | ❌ | All files properly formatted |
| TypeScript strict mode | 🟡 | Some any types need fixing |
| Code duplication | 🟡 | Monitor for duplicated code |
| Dead code | 🟡 | Remove unused exports/imports |

**Sign-off Required:** Code Quality Lead

---

### 1.2 Console Statements Removal

```bash
# Search for debug statements
grep -r "console\." src/ --exclude-dir=node_modules
```

**Checklist:**

| Item | Status | Count |
|------|--------|-------|
| console.log in API endpoints | ❌ | ~40 instances |
| console.log in components | ❌ | ~8 instances |
| console.error (legitimate) | 🟡 | Should remain for error handling |
| console.warn (legitimate) | 🟡 | Should remain for warnings |

**Definition of Done:**
- [ ] All debug console.log removed
- [ ] Only legitimate console.error for critical errors remain
- [ ] All replaced with Winston logger calls

**Sign-off Required:** Backend Lead

---

### 1.3 Logging System Implementation

**Checklist:**

| Item | Status | Owner |
|------|--------|-------|
| Winston installed | ❌ | Backend |
| Logger configuration created | ❌ | Backend |
| Middleware integration | ❌ | Backend |
| API endpoints updated | ❌ | Backend |
| Log rotation configured | ❌ | DevOps |
| Log levels set correctly | ❌ | Backend |
| Sensitive data not logged | ✅ | Code review |
| Logs directory created | ⏳ | DevOps |

**Verification:**
- [ ] Start dev server: `npm run dev`
- [ ] Make API calls
- [ ] Check `/logs` directory for generated files
- [ ] Verify log format is readable
- [ ] Test log rotation

**Sign-off Required:** Backend Lead + DevOps

---

### 1.4 TypeScript Configuration

**Checklist:**

| Item | Status | Details |
|------|--------|---------|
| Strict mode enabled | 🟡 | Enable in tsconfig.json |
| No implicit any | ❌ | Fix remaining any types |
| No unused variables | ❌ | Remove unused declarations |
| No unused parameters | ❌ | Remove from function signatures |
| Proper error handling types | 🟡 | Use Error class |

**Commands:**
```bash
npx tsc --noEmit              # Check for type errors
npm run lint                  # Check for eslint issues
```

**Sign-off Required:** Tech Lead

---

## 2. FUNCTIONALITY TESTING

### 2.1 Authentication & Session

**Test Scenarios:**

| Scenario | Status | Details |
|----------|--------|---------|
| User registration | ⏳ | Email/password validation |
| Email verification | ⏳ | Confirmation email sent |
| User login | ⏳ | Correct credentials work |
| Session persistence | ⏳ | HttpOnly cookie set |
| Session timeout | ⏳ | Session expires after 1 hour |
| Logout | ⏳ | Session cleared, user redirected |
| Protected routes | ⏳ | Unauthenticated users redirected |
| RLS enforcement | ⏳ | Database level access control |

**Commands:**
```bash
# Manual testing
1. Go to http://localhost:3000/auth
2. Register new account
3. Verify session cookie set (DevTools → Application → Cookies)
4. Navigate to /app
5. Refresh page → still logged in
6. Logout → redirected to /auth
7. Try accessing /app directly → redirected to /auth
```

**Sign-off Required:** QA Lead

---

### 2.2 Workspace Management

**Test Scenarios:**

| Scenario | Status | Details |
|----------|--------|---------|
| Auto-workspace on signup | ⏳ | Workspace created automatically |
| Workspace name display | ⏳ | Correct name shown in UI |
| Workspace switching | ⏳ | Switch between workspaces |
| Member invite | ⏳ | Add members by email |
| Member removal | ⏳ | Remove members with confirmation |
| Role assignment | ⏳ | Assign owner/admin/member roles |
| Permission enforcement | ⏳ | Members can only see assigned workspace |

**Sign-off Required:** QA Lead

---

### 2.3 Location Hierarchy

**Test Scenarios:**

| Scenario | Status | Details |
|----------|--------|---------|
| Create location | ⏳ | Add new location with name |
| Location nesting | ⏳ | Create up to 5 levels deep |
| Location tree display | ⏳ | Tree shows hierarchy correctly |
| Expand/collapse nodes | ⏳ | Tree navigation works |
| Edit location | ⏳ | Update location name |
| Delete location | ⏳ | Soft delete with confirmation |
| Box reassignment | ⏳ | Boxes moved to "Unassigned" |
| Location search in form | ⏳ | Can select location when creating box |

**Browser Testing:**
- [ ] Chrome DevTools → Device Toolbar (tablet view)
- [ ] Tree layout responsive
- [ ] Touch interactions work
- [ ] Keyboard navigation works

**Sign-off Required:** QA Lead

---

### 2.4 Box Management

**Test Scenarios:**

| Scenario | Status | Details |
|----------|--------|---------|
| Create box | ⏳ | New box form works |
| Box name validation | ⏳ | Required field |
| Box description | ⏳ | Max 10,000 chars enforced |
| Tags input | ⏳ | Add/remove tags |
| Location assignment | ⏳ | Assign to location |
| Box details view | ⏳ | All info displays correctly |
| Edit box | ⏳ | Update name, description, tags, location |
| Delete box | ⏳ | Delete with confirmation |
| Move box | ⏳ | Change location |
| Verify QR association | ⏳ | Box linked to QR code |

**Test Data:**
```
Box 1: Simple box
- Name: "Winter Clothes"
- Location: Storage > Closet
- Tags: seasonal, clothes

Box 2: Complex box
- Name: "Old Documents" (with special chars: @#$%)
- Location: Basement > Filing Cabinet > Shelf 2
- Description: Long text with 5000+ characters
- Tags: archived, important, 2024
```

**Edge Cases to Test:**
- [ ] Create box with very long name (500 chars)
- [ ] Create box with special characters in name
- [ ] Create box with emoji in description
- [ ] Create box at each location level
- [ ] Delete box with multiple tags
- [ ] Edit multiple boxes quickly

**Sign-off Required:** QA Lead

---

### 2.5 Search Functionality

**Test Scenarios:**

| Scenario | Status | Details |
|----------|--------|---------|
| Search by name | ⏳ | Type name → results appear |
| Search by description | ⏳ | Type description words → results |
| Search by tags | ⏳ | Search for tags works |
| Search minimum length | ⏳ | Require 3+ characters |
| Search debouncing | ⏳ | Debounce 300ms to avoid spam |
| Search results display | ⏳ | Show box name + location breadcrumb |
| Search result click | ⏳ | Navigate to box details |
| Search empty state | ⏳ | Show "No results" message |
| Search pagination | ⏳ | Handle 50+ results |

**Test Queries:**
- [ ] Common word: "box"
- [ ] Specific word: "seasonal"
- [ ] Special characters: "@" or "$"
- [ ] Numbers: "2024"
- [ ] Mixed case: "SeasOnal"
- [ ] Partial word: "sea" (should match "seasonal")

**Performance:**
- [ ] Search results appear < 500ms after typing stops
- [ ] No lag typing quickly
- [ ] Pagination loads quickly

**Sign-off Required:** QA Lead

---

### 2.6 QR Code Workflow

**Test Scenarios:**

| Scenario | Status | Details |
|----------|--------|---------|
| Generate QR codes | ⏳ | Batch generation works |
| QR quantity validation | ⏳ | 1-100 range enforced |
| QR display grid | ⏳ | Codes display in 3-column grid |
| QR unique IDs | ⏳ | Each code has unique ID |
| QR print dialog | ⏳ | Print button opens dialog |
| QR print layout | ⏳ | 3 columns x 7 rows on A4 |
| QR scan redirect | ⏳ | Scanning redirects to /qr/:id |
| Unassigned QR | ⏳ | Shows create box form |
| Assigned QR | ⏳ | Shows box details |

**Manual QR Testing:**
```
1. Generate 10 QR codes
2. Open Chrome DevTools → Print Preview (Ctrl+P or Cmd+P)
3. Verify layout: 3 columns, proper spacing
4. Print to PDF
5. Open PDF, verify codes readable
6. Use phone camera to scan a code (optional)
7. Verify redirect works
```

**Sign-off Required:** QA Lead

---

## 3. ACCESSIBILITY TESTING (WCAG AA)

### 3.1 Keyboard Navigation

**Test with keyboard only (no mouse):**

| Page/Feature | Status | Details |
|--------------|--------|---------|
| Tab order | ⏳ | Logical tab sequence |
| Skip links | ⏳ | Can skip to main content |
| Button activation | ⏳ | All buttons work with Enter/Space |
| Form fields | ⏳ | All inputs accessible |
| Links | ⏳ | All links keyboard accessible |
| Modals | ⏳ | Focus trapped in modal |
| Location tree | ⏳ | Navigate with Arrow keys |
| Search results | ⏳ | Navigate with Tab/Arrow keys |

**Commands:**
```
1. Tab through entire page
2. Verify focus indicators visible
3. Verify tab order makes sense
4. Verify all interactive elements reachable
5. Verify focus doesn't get lost
```

**Sign-off Required:** Accessibility Lead

---

### 3.2 Screen Reader Testing

**Test with screen reader (NVDA on Windows, VoiceOver on Mac):**

| Feature | Status | Details |
|---------|--------|---------|
| Page structure | ⏳ | Semantic HTML (h1, main, nav) |
| Form labels | ⏳ | All inputs have labels |
| Button labels | ⏳ | All buttons have accessible text |
| ARIA landmarks | ⏳ | main, navigation, search roles |
| ARIA labels | ⏳ | aria-label on icon buttons |
| ARIA descriptions | ⏳ | Complex elements described |
| Focus announcements | ⏳ | Screen reader announces focus changes |
| Tree navigation | ⏳ | Tree items announced correctly |
| Error messages | ⏳ | Error text announced to user |

**Commands (macOS VoiceOver):**
```
1. Enable VoiceOver: Cmd+F5
2. Cmd+U to open Rotor
3. Check all landmarks exist
4. Navigate with VO+Right Arrow
5. Verify announcements are helpful
```

**Commands (Windows NVDA):**
```
1. Download and run NVDA
2. Tab through entire page
3. Use Ctrl+Home to go to start
4. Use H to navigate by headings
5. Use L to navigate by landmarks
```

**Sign-off Required:** Accessibility Lead

---

### 3.3 Color & Contrast

**Checklist:**

| Item | Status | Details |
|------|--------|---------|
| Text contrast | ⏳ | 4.5:1 for normal text |
| Large text contrast | ⏳ | 3:1 for large text (18pt+) |
| Color not only indicator | ⏳ | Don't use color alone to convey info |
| Focus indicators | ⏳ | Visible 3px outline |
| Disabled state | ⏳ | Clearly indicates disabled |

**Tools:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- WAVE Browser Extension
- Lighthouse DevTools

**Sign-off Required:** Accessibility Lead

---

### 3.4 Responsive Design

**Test on Multiple Devices:**

| Device | Resolution | Status | Notes |
|--------|-----------|--------|-------|
| Desktop | 1920x1080 | ⏳ | Primary target |
| Laptop | 1366x768 | ⏳ | Common size |
| Tablet | 1024x768 | ⏳ | Portrait mode |
| Mobile | 375x667 | ⏳ | iPhone-sized |
| Mobile | 360x640 | ⏳ | Android-sized |

**Testing Approach:**
```
1. Chrome DevTools → Device Toolbar
2. Select each device
3. Test all pages and workflows
4. Check text readability
5. Check touch target sizes (min 44px)
6. Check layout doesn't break
```

**Sign-off Required:** QA Lead

---

## 4. SECURITY TESTING

### 4.1 OWASP Top 10 Validation

#### 4.1.1 Injection (SQL, XSS, etc.)

| Issue | Status | Test |
|-------|--------|------|
| SQL Injection | ⏳ | Input: `'; DROP TABLE boxes; --` |
| XSS via name | ⏳ | Input: `<script>alert('xss')</script>` |
| XSS via tags | ⏳ | Input: `<img src=x onerror=alert('xss')>` |
| Command injection | ⏳ | API should sanitize inputs |

**Expected Result:** Inputs escaped/sanitized, no console errors

---

#### 4.1.2 Broken Authentication

| Test | Status | Expected |
|------|--------|----------|
| No CSRF token bypass | ⏳ | State-changing requests protected |
| Session fixation | ⏳ | New session on login |
| Password strength | ⏳ | No weak passwords accepted |
| Session timeout | ⏳ | Sessions expire correctly |

---

#### 4.1.3 Sensitive Data Exposure

| Test | Status | Check |
|------|--------|-------|
| HTTPS only | ⏳ | Prod uses HTTPS |
| No passwords in logs | ⏳ | grep logs for secrets |
| No tokens in URLs | ⏳ | Tokens in cookies only |
| No PII in error messages | ⏳ | Generic error messages |

---

#### 4.1.4 Broken Access Control

| Test | Status | Details |
|------|--------|---------|
| User isolation | ⏳ | Can't access other user's data |
| Workspace isolation | ⏳ | Can't access other workspace's data |
| Role enforcement | ⏳ | Member can't edit workspace |
| RLS verified | ⏳ | Database enforces policies |

**Test Method:**
```
1. Create 2 users (user1, user2)
2. user1 creates box with ID: box-123
3. Try accessing as user2: /api/boxes/box-123
4. Expected: 403 Forbidden
```

---

#### 4.1.5 Security Misconfiguration

| Check | Status | Details |
|-------|--------|---------|
| CORS configured | ⏳ | Restrict to known origins |
| Security headers set | ⏳ | CSP, X-Frame-Options, etc. |
| Dependencies current | ⏳ | `npm audit` passes |
| Secrets not in repo | ⏳ | .env not committed |

---

#### 4.1.6 Vulnerable Components

```bash
# Check dependencies
npm audit

# Expected: 0 vulnerabilities
```

**Action Items:**
- [ ] Run `npm audit`
- [ ] Fix any vulnerabilities
- [ ] Update packages if needed

---

#### 4.1.7 Insufficient Logging & Monitoring

**Checklist:**

| Item | Status | Details |
|------|--------|---------|
| Audit logs | ⏳ | Log sensitive operations |
| Error logging | ⏳ | All errors captured |
| Access logging | ⏳ | Track who accessed what |
| Alert system | ⏳ | Alert on suspicious activity |

**Sign-off Required:** Security Lead

---

### 4.2 Third-Party Security

**Checklist:**

| Item | Status | Details |
|------|--------|---------|
| Supabase security | ✅ | Uses industry-standard auth |
| RLS policies tested | ⏳ | Database level security |
| API key rotation | ⏳ | Regular key rotation process |
| Secrets management | ⏳ | Env vars not in repo |

---

## 5. PERFORMANCE TESTING

### 5.1 Load Time

**Metrics:**

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| First Contentful Paint (FCP) | < 2s | TBD | ⏳ |
| Largest Contentful Paint (LCP) | < 3s | TBD | ⏳ |
| Time to Interactive (TTI) | < 3s | TBD | ⏳ |
| Cumulative Layout Shift (CLS) | < 0.1 | TBD | ⏳ |

**Testing Tool:**
```
1. Chrome DevTools → Lighthouse
2. Run audit (Desktop)
3. Run audit (Mobile)
4. Record scores
5. Optimize if needed
```

---

### 5.2 API Response Time

**Endpoints to Measure:**

| Endpoint | Target | Method | Status |
|----------|--------|--------|--------|
| `/api/boxes` | < 500ms | GET with search | ⏳ |
| `/api/locations` | < 300ms | GET | ⏳ |
| `/api/boxes/:id` | < 300ms | GET | ⏳ |
| `/api/qr-codes/batch` | < 2s | POST (20 codes) | ⏳ |

**Testing Tool:**
```bash
# Using curl
time curl http://localhost:3000/api/boxes?q=test

# Using Apache Bench (if available)
ab -n 100 -c 10 http://localhost:3000/api/boxes
```

---

### 5.3 Bundle Size

**Target:** < 200KB gzipped (client)

```bash
npm run build

# Check output:
# dist/client/_astro/*.js files should total < 200KB (gzipped)
```

---

### 5.4 Search Performance

**Test:** Search with various query sizes

| Query | Size | Target Response | Status |
|-------|------|-----------------|--------|
| "a" | 1 char | < 100ms (not triggered) | ⏳ |
| "box" | 3 chars | < 500ms | ⏳ |
| "seasonal clothing" | Long | < 500ms | ⏳ |
| Special chars | Various | < 500ms | ⏳ |

---

## 6. DOCUMENTATION VERIFICATION

### 6.1 API Documentation

**Checklist:**

- [ ] All 14 endpoints documented
- [ ] Request/response examples provided
- [ ] Error codes documented
- [ ] Authentication method explained
- [ ] Rate limiting mentioned
- [ ] Example curl commands work

**Files:**
- [x] `.ai_docs/api-plan.md` - EXISTS
- [ ] Verify content is current

---

### 6.2 Database Documentation

**Checklist:**

- [x] Schema documented (db-plan.md exists)
- [ ] All tables described
- [ ] Relationships shown
- [ ] RLS policies explained
- [ ] Migration process documented

---

### 6.3 Deployment Guide

**Checklist:**

- [ ] Prerequisites listed (Node version, npm version)
- [ ] Environment setup steps clear
- [ ] Database migration instructions
- [ ] Build command documented
- [ ] Deploy command documented
- [ ] Post-deploy verification steps
- [ ] Rollback procedures documented

---

### 6.4 User Guide

**Checklist:**

- [ ] Getting started section
- [ ] Screenshots for each feature
- [ ] Step-by-step workflows
- [ ] FAQ section
- [ ] Troubleshooting guide
- [ ] Support contact info

---

### 6.5 Known Issues Document

**Checklist:**

- [ ] All identified issues listed
- [ ] Severity levels assigned
- [ ] Workarounds provided
- [ ] Expected fix dates
- [ ] GitHub issue links

---

## 7. INFRASTRUCTURE & DEPLOYMENT

### 7.1 Environment Configuration

**Checklist:**

| Item | Status | Details |
|------|--------|---------|
| .env.example created | ⏳ | All vars documented |
| Staging env ready | ⏳ | Full copy of prod setup |
| Production env ready | ⏳ | All secrets configured |
| Backup strategy | ⏳ | Daily backups scheduled |
| Log rotation | ⏳ | Old logs archived |

---

### 7.2 Monitoring & Logging

**Checklist:**

| Item | Status | Details |
|------|--------|---------|
| Error tracking | ⏳ | Sentry or similar setup |
| Performance monitoring | ⏳ | Monitor response times |
| Uptime monitoring | ⏳ | Alert if service down |
| Log aggregation | ⏳ | Logs centralized |
| Alert thresholds | ⏳ | Alert on high error rates |

---

### 7.3 Database Backup & Recovery

**Checklist:**

- [ ] Automated backups scheduled
- [ ] Backup retention policy
- [ ] Backup encryption enabled
- [ ] Recovery procedure documented
- [ ] Recovery test performed

---

## 8. PRE-DEPLOYMENT FINAL CHECKLIST

### 8.1 Code Review

**Checklist:**

- [ ] All PRs reviewed by 2+ people
- [ ] No approved TODOs or FIXMEs in main
- [ ] No debug code left
- [ ] All tests passing
- [ ] No merge conflicts

---

### 8.2 Testing Complete

**Checklist:**

- [ ] Unit tests: 70%+ coverage
- [ ] E2E tests: All critical paths
- [ ] Manual testing: All browsers
- [ ] Accessibility: WCAG AA
- [ ] Security: OWASP checklist
- [ ] Performance: Metrics met

---

### 8.3 Build Verification

**Checklist:**

```bash
# Run these commands and verify success
npm run lint          # ✅ 0 errors
npm run build         # ✅ Build succeeds
npm run test          # ✅ Tests pass (if available)
npm run preview       # ✅ Preview works
```

**Checklist:**
- [ ] Build completes without errors
- [ ] Preview server starts
- [ ] All pages load
- [ ] All APIs work
- [ ] No console errors

---

### 8.4 Staging Deployment

**Checklist:**

- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Verify all features
- [ ] Test from different IP
- [ ] Test on mobile network
- [ ] No 404 errors
- [ ] Logging working

---

### 8.5 Production Readiness

**Final Checklist Before Go-Live:**

- [ ] All code reviewed
- [ ] All tests passing
- [ ] All documentation current
- [ ] Monitoring configured
- [ ] Backup verified
- [ ] Rollback plan ready
- [ ] On-call support assigned
- [ ] Announcement ready
- [ ] Marketing materials ready
- [ ] Support team briefed

---

## 9. SIGN-OFF PAGE

### Approval Required From

**Checklist:**

| Role | Name | Date | Sign-off |
|------|------|------|----------|
| Tech Lead | _____ | _____ | ☐ |
| QA Lead | _____ | _____ | ☐ |
| Security Lead | _____ | _____ | ☐ |
| Product Manager | _____ | _____ | ☐ |
| DevOps Lead | _____ | _____ | ☐ |
| Project Manager | _____ | _____ | ☐ |

---

### Notes & Issues Discovered

```
[Space for final issues/notes before launch]

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________
```

---

### Post-Launch Monitoring (First 24 Hours)

**Team to Monitor:**

- [ ] Error logs (< 1% error rate)
- [ ] Performance (< 3s load time)
- [ ] Database (< 500ms queries)
- [ ] User feedback
- [ ] Support tickets

**Escalation:**
- [ ] Critical issue (> 10% errors) → Immediate rollback
- [ ] Major issue (> 5% errors) → Hotfix
- [ ] Minor issue (< 5% errors) → Post-launch fix

---

## APPENDIX: TESTING RESOURCES

### Tools Recommended

1. **Browser Testing:**
   - Chrome DevTools
   - Firefox Developer Tools
   - Safari Developer Tools

2. **API Testing:**
   - Postman
   - Insomnia
   - curl (command line)

3. **Accessibility:**
   - WAVE Browser Extension
   - axe DevTools
   - NVDA (Windows)
   - VoiceOver (macOS)

4. **Performance:**
   - Google Lighthouse
   - WebPageTest
   - Chrome DevTools Profiler

5. **Security:**
   - OWASP ZAP
   - npm audit
   - Snyk (dependency scanning)

### Test Data Template

```sql
-- Create test users
INSERT INTO auth.users VALUES (
  gen_random_uuid(),
  'testuser1@example.com',
  -- hashed password for "TestPass123"
  ...
);

-- Create test workspace
INSERT INTO public.workspaces VALUES (...);

-- Create test locations
INSERT INTO public.locations VALUES (...);

-- Create test boxes
INSERT INTO public.boxes VALUES (...);
```

---

**Document Created:** 2025-12-31
**Version:** 1.0
**Status:** READY FOR USE

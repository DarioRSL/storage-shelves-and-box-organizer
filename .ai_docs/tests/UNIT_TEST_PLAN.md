# Unit Test Implementation Plan

**Version:** 1.0
**Last Updated:** January 11, 2026
**Status:** Ready for Implementation
**Target Coverage:** 80% for service layer and validation logic

---

## Executive Summary

This document provides a comprehensive, prioritized plan for implementing unit tests for the Storage & Box Organizer application. Currently, the project has **0 production unit tests** (only example tests exist). This plan identifies **26 critical files** requiring unit test coverage, organized into 4 implementation phases spanning approximately 8-10 days of focused development.

**Current State:**
- ✅ Test infrastructure configured (Vitest, Testing Library, coverage tools)
- ✅ Testing guidelines documented ([guideline_testing.md](.claude/commands/guideline_testing.md))
- ❌ No production unit tests written

**Goal:**
- Achieve 80% code coverage for utility functions, validators, and custom hooks
- Establish comprehensive test suite for critical business logic
- Prevent regressions in core functionality

---

## Table of Contents

1. [Testing Strategy](#1-testing-strategy)
2. [Phase 1: Quick Wins (Priority: CRITICAL)](#2-phase-1-quick-wins-priority-critical)
3. [Phase 2: Core Logic (Priority: HIGH)](#3-phase-2-core-logic-priority-high)
4. [Phase 3: Extended Coverage (Priority: MEDIUM)](#4-phase-3-extended-coverage-priority-medium)
5. [Phase 4: Advanced (Priority: LOW)](#5-phase-4-advanced-priority-low)
6. [Test Utilities & Helpers](#6-test-utilities--helpers)
7. [Implementation Timeline](#7-implementation-timeline)
8. [Success Metrics](#8-success-metrics)

---

## 1. Testing Strategy

### 1.1 Why Unit Tests?

**Benefits:**
- ✅ **Fast feedback loop** - Tests run in milliseconds
- ✅ **Isolated testing** - No database, no API dependencies
- ✅ **Easy debugging** - Pinpoint exact failure location
- ✅ **Refactoring confidence** - Prevent regressions
- ✅ **Documentation** - Tests serve as living documentation

**What to Unit Test:**
- ✅ Pure functions (no side effects)
- ✅ Validation logic (Zod schemas)
- ✅ Business rules and calculations
- ✅ Error handling logic
- ✅ Data transformations

**What NOT to Unit Test:**
- ❌ Services with Supabase calls (use integration tests)
- ❌ API endpoints (use integration tests with Supertest)
- ❌ React components (use E2E tests with Playwright or React Testing Library)
- ❌ Database queries (use integration tests)

### 1.2 Testing Pyramid for This Project

```
         /\
        /E2E\        10% - Critical user journeys (Playwright)
       /------\
      /Integration\ 30% - API + DB + Services (Vitest + Supertest)
     /------------\
    /    Unit      \ 60% - Business logic + Validation (Vitest)
   /----------------\
```

### 1.3 Coverage Targets

| Category | Target Coverage | Rationale |
|----------|----------------|-----------|
| **Utility Functions** | 100% | Pure functions, critical for data integrity |
| **Validators (Zod)** | 100% | Input validation is security-critical |
| **Custom Hooks** | 80-100% | Core reusable logic |
| **Error Handling** | 100% | Critical for UX and debugging |
| **Services (mockable)** | 60-80% | Focus on business logic, not DB calls |
| **Overall Target** | 80% | Balanced approach |

---

## 2. Phase 1: Quick Wins (Priority: CRITICAL)

**Duration:** 1-2 days
**Estimated Effort:** 16-20 hours
**Coverage Impact:** ~30% of total unit test coverage

These files are **pure functions** or **isolated logic** with **zero dependencies** - ideal starting point.

---

### 2.1 `src/lib/utils/transliterate.ts`

**Priority:** ⭐⭐⭐⭐⭐ **CRITICAL**

**Why Test:**
- **Data integrity risk** - Errors corrupt ltree paths in PostgreSQL
- **Security impact** - Malformed paths could bypass RLS policies
- **Pure functions** - No side effects, 100% deterministic
- **Edge cases** - Polish characters, special chars, Unicode

**Functions to Test:**

#### `transliteratePolish(text: string): string`

Converts Polish diacritics to ASCII equivalents for ltree compatibility.

**Test Cases:**

| Test ID | Description | Input | Expected Output | Category |
|---------|-------------|-------|----------------|----------|
| TC-TRANS-001 | Polish lowercase chars | `"ąćęłńóśźż"` | `"acelnoszz"` | Happy path |
| TC-TRANS-002 | Polish uppercase chars | `"ĄĆĘŁŃÓŚŹŻ"` | `"ACELNOSZZ"` | Happy path |
| TC-TRANS-003 | Mixed Polish and ASCII | `"Garaż Metalowy"` | `"Garaz Metalowy"` | Happy path |
| TC-TRANS-004 | Only ASCII (no changes) | `"Garage 123"` | `"Garage 123"` | Edge case |
| TC-TRANS-005 | Empty string | `""` | `""` | Edge case |
| TC-TRANS-006 | Special characters preserved | `"Półka #1"` | `"Polka #1"` | Edge case |
| TC-TRANS-007 | All Polish chars (comprehensive) | `"aąbcćdeęfghijklłmnńoópqrsśtuvwxyzźż"` | `"aabccdeeefghijklllmnnoopqrsstuvwxyzzzz"` | Comprehensive |
| TC-TRANS-008 | Unicode normalization | `"Łódź"` | `"Lodz"` | Edge case |
| TC-TRANS-009 | Only spaces | `"   "` | `"   "` | Edge case |
| TC-TRANS-010 | Numbers and symbols | `"123-456_789"` | `"123-456_789"` | Edge case |

**Example Test Structure:**

```typescript
// tests/unit/utils/transliterate.test.ts
import { describe, it, expect } from 'vitest';
import { transliteratePolish, sanitizeForLtree } from '@/lib/utils/transliterate';

describe('transliteratePolish', () => {
  describe('Polish lowercase characters', () => {
    it('should convert all Polish lowercase diacritics to ASCII', () => {
      const input = 'ąćęłńóśźż';
      const result = transliteratePolish(input);
      expect(result).toBe('acelnoszz');
    });

    it('should preserve non-Polish characters', () => {
      const input = 'abc123!@#';
      const result = transliteratePolish(input);
      expect(result).toBe('abc123!@#');
    });
  });

  describe('Polish uppercase characters', () => {
    it('should convert all Polish uppercase diacritics to ASCII', () => {
      const input = 'ĄĆĘŁŃÓŚŹŻ';
      const result = transliteratePolish(input);
      expect(result).toBe('ACELNOSZZ');
    });
  });

  describe('Mixed content', () => {
    it('should handle mixed Polish and ASCII text', () => {
      const input = 'Garaż Metalowy';
      const result = transliteratePolish(input);
      expect(result).toBe('Garaz Metalowy');
    });

    it('should preserve spaces and punctuation', () => {
      const input = 'Półka #1: Narzędzia';
      const result = transliteratePolish(input);
      expect(result).toBe('Polka #1: Narzedzia');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(transliteratePolish('')).toBe('');
    });

    it('should handle string with only spaces', () => {
      expect(transliteratePolish('   ')).toBe('   ');
    });

    it('should handle string with no Polish characters', () => {
      const input = 'Garage 123';
      expect(transliteratePolish(input)).toBe(input);
    });
  });
});
```

#### `sanitizeForLtree(text: string): string`

Converts text to ltree-safe format (lowercase, underscores, no special chars).

**Test Cases:**

| Test ID | Description | Input | Expected Output | Rationale |
|---------|-------------|-------|----------------|-----------|
| TC-LTREE-001 | Lowercase conversion | `"GARAGE"` | `"garage"` | ltree requires lowercase |
| TC-LTREE-002 | Space to underscore | `"Metal Rack"` | `"metal_rack"` | Spaces not allowed in ltree |
| TC-LTREE-003 | Special char removal | `"Półka #1"` | `"polka_1"` | Only a-z, 0-9, _ allowed |
| TC-LTREE-004 | Consecutive underscores | `"A   B   C"` | `"a_b_c"` | Collapse multiple underscores |
| TC-LTREE-005 | Edge underscore trimming | `"_Test_"` | `"test"` | Remove leading/trailing underscores |
| TC-LTREE-006 | Real-world example | `"Garaż Metalowy #3"` | `"garaz_metalowy_3"` | Complete transformation |
| TC-LTREE-007 | Empty string | `""` | `""` | Handle empty input |
| TC-LTREE-008 | Only special chars | `"!@#$%^"` | `""` | All chars removed |
| TC-LTREE-009 | Polish chars + spaces | `"Półka Górna"` | `"polka_gorna"` | Combo transliterate + sanitize |
| TC-LTREE-010 | Numbers preserved | `"Rack 2A"` | `"rack_2a"` | Numbers are allowed |

**Example Test Structure:**

```typescript
describe('sanitizeForLtree', () => {
  describe('Basic transformations', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeForLtree('GARAGE')).toBe('garage');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeForLtree('Metal Rack')).toBe('metal_rack');
    });

    it('should remove special characters', () => {
      expect(sanitizeForLtree('Shelf #1')).toBe('shelf_1');
    });
  });

  describe('Polish character handling', () => {
    it('should transliterate Polish characters and sanitize', () => {
      expect(sanitizeForLtree('Półka Górna')).toBe('polka_gorna');
    });

    it('should handle complex Polish text', () => {
      expect(sanitizeForLtree('Garaż Metalowy #3')).toBe('garaz_metalowy_3');
    });
  });

  describe('Underscore normalization', () => {
    it('should collapse consecutive underscores', () => {
      expect(sanitizeForLtree('A   B   C')).toBe('a_b_c');
    });

    it('should trim leading underscores', () => {
      expect(sanitizeForLtree('_Test')).toBe('test');
    });

    it('should trim trailing underscores', () => {
      expect(sanitizeForLtree('Test_')).toBe('test');
    });

    it('should trim both leading and trailing underscores', () => {
      expect(sanitizeForLtree('__Test__')).toBe('test');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeForLtree('')).toBe('');
    });

    it('should handle string with only special characters', () => {
      expect(sanitizeForLtree('!@#$%^&*()')).toBe('');
    });

    it('should preserve alphanumeric characters', () => {
      expect(sanitizeForLtree('Rack2A')).toBe('rack2a');
    });
  });

  describe('Real-world examples', () => {
    it('should sanitize garage location name', () => {
      expect(sanitizeForLtree('Garaż Metalowy')).toBe('garaz_metalowy');
    });

    it('should sanitize shelf with number', () => {
      expect(sanitizeForLtree('Półka #1')).toBe('polka_1');
    });

    it('should sanitize complex hierarchy', () => {
      expect(sanitizeForLtree('Basement > Metal Rack > Top Shelf'))
        .toBe('basement_metal_rack_top_shelf');
    });
  });
});
```

**Estimated Time:** 3-4 hours
**Coverage Goal:** 100%

---

### 2.2 `src/components/hooks/usePasswordStrength.ts`

**Priority:** ⭐⭐⭐⭐⭐ **CRITICAL**

**Why Test:**
- **Security-critical** - Weak password validation exposes users to attacks
- **Complex business logic** - Scoring system with multiple rules
- **Pure function** - `evaluatePasswordStrength` is easily testable
- **User-facing** - Incorrect feedback frustrates users

**Functions to Test:**

#### `evaluatePasswordStrength(password: string): PasswordStrengthResult`

Returns password strength analysis with score, level, and detailed criteria.

**Test Cases:**

| Test ID | Description | Input | Expected Output | Score |
|---------|-------------|-------|----------------|-------|
| TC-PWD-001 | Empty password | `""` | `{ level: "weak", score: 0, hasMinLength: false, ... }` | 0 |
| TC-PWD-002 | Too short (< 8 chars) | `"Abc1!"` | `{ level: "weak", score: 80, hasMinLength: false }` | 80 |
| TC-PWD-003 | Min length only | `"12345678"` | `{ level: "weak", score: 40, hasMinLength: true, hasNumbers: true }` | 40 |
| TC-PWD-004 | Medium password | `"Password1"` | `{ level: "medium", score: 80 }` | 80 |
| TC-PWD-005 | Strong password | `"Pass1234!"` | `{ level: "strong", score: 100 }` | 100 |
| TC-PWD-006 | Only lowercase | `"abcdefgh"` | `{ level: "medium", score: 40, hasLowercase: true }` | 40 |
| TC-PWD-007 | Only uppercase | `"ABCDEFGH"` | `{ level: "medium", score: 40, hasUppercase: true }` | 40 |
| TC-PWD-008 | Only numbers | `"12345678"` | `{ level: "medium", score: 40, hasNumbers: true }` | 40 |
| TC-PWD-009 | Only special chars | `"!@#$%^&*"` | `{ level: "medium", score: 40, hasSpecialChars: true }` | 40 |
| TC-PWD-010 | All criteria met | `"Abc123!@#"` | `{ level: "strong", score: 100 }` | 100 |
| TC-PWD-011 | Weak with spaces | `"abc 123"` | `{ level: "weak", score: 40 }` | 40 |
| TC-PWD-012 | Real strong password | `"MyP@ssw0rd2024"` | `{ level: "strong", score: 100 }` | 100 |

**Scoring Logic:**
- Min length (8 chars): +20 points
- Lowercase letters: +20 points
- Uppercase letters: +20 points
- Numbers: +20 points
- Special characters: +20 points

**Level Classification:**
- `score >= 60`: **strong**
- `score >= 40`: **medium**
- `score < 40`: **weak**

**Example Test Structure:**

```typescript
// tests/unit/hooks/usePasswordStrength.test.ts
import { describe, it, expect } from 'vitest';
import { evaluatePasswordStrength } from '@/components/hooks/usePasswordStrength';

describe('evaluatePasswordStrength', () => {
  describe('Score calculation', () => {
    it('should return score 0 for empty password', () => {
      const result = evaluatePasswordStrength('');
      expect(result.score).toBe(0);
      expect(result.level).toBe('weak');
    });

    it('should give 20 points for min length (8 chars)', () => {
      const result = evaluatePasswordStrength('12345678');
      expect(result.hasMinLength).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(20);
    });

    it('should give 20 points for lowercase letters', () => {
      const result = evaluatePasswordStrength('abcdefgh');
      expect(result.hasLowercase).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(20);
    });

    it('should give 20 points for uppercase letters', () => {
      const result = evaluatePasswordStrength('ABCDEFGH');
      expect(result.hasUppercase).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(20);
    });

    it('should give 20 points for numbers', () => {
      const result = evaluatePasswordStrength('12345678');
      expect(result.hasNumbers).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(20);
    });

    it('should give 20 points for special characters', () => {
      const result = evaluatePasswordStrength('!@#$%^&*()');
      expect(result.hasSpecialChars).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(20);
    });

    it('should calculate 100 score when all criteria met', () => {
      const result = evaluatePasswordStrength('Abc123!@#');
      expect(result.score).toBe(100);
      expect(result.hasMinLength).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasNumbers).toBe(true);
      expect(result.hasSpecialChars).toBe(true);
    });
  });

  describe('Level classification', () => {
    it('should classify as weak when score < 40', () => {
      const result = evaluatePasswordStrength('abc');
      expect(result.level).toBe('weak');
      expect(result.feedback).toBe('Słabe hasło');
    });

    it('should classify as medium when score >= 40 and < 60', () => {
      const result = evaluatePasswordStrength('Password');
      expect(result.level).toBe('medium');
      expect(result.feedback).toBe('Średnie hasło');
    });

    it('should classify as strong when score >= 60', () => {
      const result = evaluatePasswordStrength('Pass1234!');
      expect(result.level).toBe('strong');
      expect(result.feedback).toBe('Silne hasło');
    });
  });

  describe('Criteria detection', () => {
    it('should detect min length of 8 characters', () => {
      expect(evaluatePasswordStrength('1234567').hasMinLength).toBe(false);
      expect(evaluatePasswordStrength('12345678').hasMinLength).toBe(true);
    });

    it('should detect uppercase letters', () => {
      expect(evaluatePasswordStrength('password').hasUppercase).toBe(false);
      expect(evaluatePasswordStrength('Password').hasUppercase).toBe(true);
    });

    it('should detect lowercase letters', () => {
      expect(evaluatePasswordStrength('PASSWORD').hasLowercase).toBe(false);
      expect(evaluatePasswordStrength('Password').hasLowercase).toBe(true);
    });

    it('should detect numbers', () => {
      expect(evaluatePasswordStrength('Password').hasNumbers).toBe(false);
      expect(evaluatePasswordStrength('Password1').hasNumbers).toBe(true);
    });

    it('should detect special characters', () => {
      expect(evaluatePasswordStrength('Password1').hasSpecialChars).toBe(false);
      expect(evaluatePasswordStrength('Password1!').hasSpecialChars).toBe(true);
    });
  });

  describe('Real-world password examples', () => {
    it('should evaluate weak password correctly', () => {
      const result = evaluatePasswordStrength('abc123');
      expect(result.level).toBe('weak');
      expect(result.score).toBeLessThan(60);
    });

    it('should evaluate medium password correctly', () => {
      const result = evaluatePasswordStrength('Password1');
      expect(result.level).toBe('medium');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(80);
    });

    it('should evaluate strong password correctly', () => {
      const result = evaluatePasswordStrength('MyP@ssw0rd2024');
      expect(result.level).toBe('strong');
      expect(result.score).toBe(100);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const result = evaluatePasswordStrength('');
      expect(result.score).toBe(0);
      expect(result.level).toBe('weak');
    });

    it('should handle password with only spaces', () => {
      const result = evaluatePasswordStrength('        ');
      expect(result.hasMinLength).toBe(true); // 8 spaces
      expect(result.hasLowercase).toBe(false);
      expect(result.score).toBe(20); // Only length criterion met
    });

    it('should handle very long password', () => {
      const longPassword = 'Abc123!@#' + 'x'.repeat(100);
      const result = evaluatePasswordStrength(longPassword);
      expect(result.score).toBe(100);
      expect(result.level).toBe('strong');
    });
  });
});
```

**Estimated Time:** 3-4 hours
**Coverage Goal:** 100%

---

### 2.3 `src/lib/validators/qr-code.validators.ts`

**Priority:** ⭐⭐⭐⭐ **HIGH**

**Why Test:**
- **Business-critical** - QR code format must be exact for scanning
- **Regex validation** - Pattern `/^QR-[A-Z0-9]{6}$/` requires thorough testing
- **Input constraints** - Batch quantity limits (1-100) prevent abuse
- **Security** - Invalid UUIDs could expose data

**Validators to Test:**

#### `GetQrCodeByShortIdSchema`

Validates QR code short_id format.

**Test Cases:**

| Test ID | Description | Input | Should Pass | Error Message |
|---------|-------------|-------|-------------|---------------|
| TC-QRID-001 | Valid QR code | `{ short_id: "QR-A1B2C3" }` | ✅ Yes | - |
| TC-QRID-002 | Valid all uppercase | `{ short_id: "QR-ABCDEF" }` | ✅ Yes | - |
| TC-QRID-003 | Valid all numbers | `{ short_id: "QR-123456" }` | ✅ Yes | - |
| TC-QRID-004 | Invalid: lowercase | `{ short_id: "QR-abc123" }` | ❌ No | "Nieprawidłowy format ID kodu QR..." |
| TC-QRID-005 | Invalid: too short | `{ short_id: "QR-A1B2" }` | ❌ No | "Nieprawidłowy format ID kodu QR..." |
| TC-QRID-006 | Invalid: too long | `{ short_id: "QR-A1B2C3D" }` | ❌ No | "Nieprawidłowy format ID kodu QR..." |
| TC-QRID-007 | Invalid: missing prefix | `{ short_id: "A1B2C3" }` | ❌ No | "Nieprawidłowy format ID kodu QR..." |
| TC-QRID-008 | Invalid: special chars | `{ short_id: "QR-A!B@C#" }` | ❌ No | "Nieprawidłowy format ID kodu QR..." |
| TC-QRID-009 | Invalid: spaces | `{ short_id: "QR-A1 B2C" }` | ❌ No | "Nieprawidłowy format ID kodu QR..." |
| TC-QRID-010 | Invalid: wrong prefix | `{ short_id: "QC-A1B2C3" }` | ❌ No | "Nieprawidłowy format ID kodu QR..." |

**Example Test Structure:**

```typescript
// tests/unit/validators/qr-code.validators.test.ts
import { describe, it, expect } from 'vitest';
import {
  GetQrCodeByShortIdSchema,
  BatchGenerateQrCodesRequestSchema
} from '@/lib/validators/qr-code.validators';

describe('QR Code Validators', () => {
  describe('GetQrCodeByShortIdSchema', () => {
    describe('Valid QR code formats', () => {
      it('should accept valid QR code with uppercase letters and numbers', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-A1B2C3',
        });
        expect(result.success).toBe(true);
      });

      it('should accept QR code with all uppercase letters', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-ABCDEF',
        });
        expect(result.success).toBe(true);
      });

      it('should accept QR code with all numbers', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-123456',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid QR code formats', () => {
      it('should reject lowercase letters', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-abc123',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format');
        }
      });

      it('should reject too short code (< 6 characters)', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-A1B2',
        });
        expect(result.success).toBe(false);
      });

      it('should reject too long code (> 6 characters)', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-A1B2C3D',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing QR- prefix', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'A1B2C3',
        });
        expect(result.success).toBe(false);
      });

      it('should reject special characters', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-A!B@C#',
        });
        expect(result.success).toBe(false);
      });

      it('should reject spaces', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-A1 B2C',
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
```

#### `BatchGenerateQrCodesRequestSchema`

Validates workspace_id and quantity for batch generation.

**Test Cases:**

| Test ID | Description | Input | Should Pass | Error Message |
|---------|-------------|-------|-------------|---------------|
| TC-BATCH-001 | Valid min quantity | `{ workspace_id: "valid-uuid", quantity: 1 }` | ✅ Yes | - |
| TC-BATCH-002 | Valid max quantity | `{ workspace_id: "valid-uuid", quantity: 100 }` | ✅ Yes | - |
| TC-BATCH-003 | Valid mid quantity | `{ workspace_id: "valid-uuid", quantity: 20 }` | ✅ Yes | - |
| TC-BATCH-004 | Invalid: quantity 0 | `{ workspace_id: "valid-uuid", quantity: 0 }` | ❌ No | "Ilość musi wynosić co najmniej 1" |
| TC-BATCH-005 | Invalid: negative | `{ workspace_id: "valid-uuid", quantity: -5 }` | ❌ No | "Ilość musi wynosić co najmniej 1" |
| TC-BATCH-006 | Invalid: exceeds max | `{ workspace_id: "valid-uuid", quantity: 150 }` | ❌ No | "Ilość nie może przekraczać 100" |
| TC-BATCH-007 | Invalid: decimal | `{ workspace_id: "valid-uuid", quantity: 10.5 }` | ❌ No | "Ilość musi być liczbą całkowitą" |
| TC-BATCH-008 | Invalid: string | `{ workspace_id: "valid-uuid", quantity: "20" }` | ❌ No | Type error |
| TC-BATCH-009 | Invalid: UUID format | `{ workspace_id: "invalid", quantity: 20 }` | ❌ No | "Nieprawidłowy format workspace_id" |
| TC-BATCH-010 | Missing workspace_id | `{ quantity: 20 }` | ❌ No | Required field error |

**Example Test Structure:**

```typescript
describe('BatchGenerateQrCodesRequestSchema', () => {
  const validWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';

  describe('Valid batch requests', () => {
    it('should accept minimum quantity (1)', () => {
      const result = BatchGenerateQrCodesRequestSchema.safeParse({
        workspace_id: validWorkspaceId,
        quantity: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should accept maximum quantity (100)', () => {
      const result = BatchGenerateQrCodesRequestSchema.safeParse({
        workspace_id: validWorkspaceId,
        quantity: 100,
      });
      expect(result.success).toBe(true);
    });

    it('should accept typical quantity (20)', () => {
      const result = BatchGenerateQrCodesRequestSchema.safeParse({
        workspace_id: validWorkspaceId,
        quantity: 20,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid quantity', () => {
    it('should reject quantity 0', () => {
      const result = BatchGenerateQrCodesRequestSchema.safeParse({
        workspace_id: validWorkspaceId,
        quantity: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('co najmniej 1');
      }
    });

    it('should reject negative quantity', () => {
      const result = BatchGenerateQrCodesRequestSchema.safeParse({
        workspace_id: validWorkspaceId,
        quantity: -5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject quantity > 100', () => {
      const result = BatchGenerateQrCodesRequestSchema.safeParse({
        workspace_id: validWorkspaceId,
        quantity: 150,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('nie może przekraczać 100');
      }
    });

    it('should reject decimal quantity', () => {
      const result = BatchGenerateQrCodesRequestSchema.safeParse({
        workspace_id: validWorkspaceId,
        quantity: 10.5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('liczbą całkowitą');
      }
    });

    it('should reject string quantity', () => {
      const result = BatchGenerateQrCodesRequestSchema.safeParse({
        workspace_id: validWorkspaceId,
        quantity: '20',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid workspace_id', () => {
    it('should reject invalid UUID format', () => {
      const result = BatchGenerateQrCodesRequestSchema.safeParse({
        workspace_id: 'not-a-uuid',
        quantity: 20,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Nieprawidłowy format');
      }
    });

    it('should reject missing workspace_id', () => {
      const result = BatchGenerateQrCodesRequestSchema.safeParse({
        quantity: 20,
      });
      expect(result.success).toBe(false);
    });
  });
});
```

**Estimated Time:** 3-4 hours
**Coverage Goal:** 100%

---

### 2.4 `src/lib/validators/box.validators.ts`

**Priority:** ⭐⭐⭐⭐ **HIGH**

**Why Test:**
- **Complex validation logic** - 6 different schemas with various rules
- **Data transformation** - `.transform()` logic needs verification
- **Business constraints** - Description length (10,000 chars), pagination limits
- **Critical user flow** - Box creation/editing is core functionality

**Validators to Test:**

#### `CreateBoxSchema`

**Test Cases:**

| Test ID | Description | Input | Should Pass | Notes |
|---------|-------------|-------|-------------|-------|
| TC-BOX-CREATE-001 | Valid minimal box | `{ workspace_id: "uuid", name: "Tools" }` | ✅ Yes | Only required fields |
| TC-BOX-CREATE-002 | Valid with all fields | Full object with description, tags, location, QR | ✅ Yes | Complete box |
| TC-BOX-CREATE-003 | Name trimming | `{ name: "  Tools  " }` | ✅ Yes | Should trim to "Tools" |
| TC-BOX-CREATE-004 | Empty name | `{ name: "" }` | ❌ No | "Nazwa pudełka jest wymagana" |
| TC-BOX-CREATE-005 | Description max length | `{ description: "x".repeat(10001) }` | ❌ No | "Opis nie może przekraczać 10000 znaków" |
| TC-BOX-CREATE-006 | Valid description length | `{ description: "x".repeat(10000) }` | ✅ Yes | Exactly at limit |
| TC-BOX-CREATE-007 | Invalid workspace UUID | `{ workspace_id: "invalid" }` | ❌ No | UUID validation error |
| TC-BOX-CREATE-008 | Null description | `{ description: null }` | ✅ Yes | Nullable field |
| TC-BOX-CREATE-009 | Empty tags array | `{ tags: [] }` | ✅ Yes | Empty array allowed |
| TC-BOX-CREATE-010 | Invalid tags type | `{ tags: "string" }` | ❌ No | Must be array |

**Example Test Structure:**

```typescript
// tests/unit/validators/box.validators.test.ts
import { describe, it, expect } from 'vitest';
import {
  CreateBoxSchema,
  GetBoxesQuerySchema,
  UpdateBoxSchema,
  CheckDuplicateBoxSchema
} from '@/lib/validators/box.validators';
import { ValidationRules } from '@/types';

describe('Box Validators', () => {
  const validWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';
  const validLocationId = '660e8400-e29b-41d4-a716-446655440000';
  const validQrCodeId = '770e8400-e29b-41d4-a716-446655440000';

  describe('CreateBoxSchema', () => {
    describe('Valid box creation', () => {
      it('should accept minimal valid box with only required fields', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
        });
        expect(result.success).toBe(true);
      });

      it('should accept box with all fields', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
          description: 'Various hand tools',
          tags: ['tools', 'hardware'],
          location_id: validLocationId,
          qr_code_id: validQrCodeId,
        });
        expect(result.success).toBe(true);
      });

      it('should accept box with null optional fields', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
          description: null,
          tags: null,
          location_id: null,
          qr_code_id: null,
        });
        expect(result.success).toBe(true);
      });
    });

    describe('Name validation', () => {
      it('should trim whitespace from name', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: '  Tools  ',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Tools');
        }
      });

      it('should reject empty name', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: '',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('wymagana');
        }
      });

      it('should reject whitespace-only name', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: '   ',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('Description validation', () => {
      it('should accept description up to max length', () => {
        const maxLength = ValidationRules.boxes.MAX_DESCRIPTION_LENGTH;
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
          description: 'x'.repeat(maxLength),
        });
        expect(result.success).toBe(true);
      });

      it('should reject description exceeding max length', () => {
        const maxLength = ValidationRules.boxes.MAX_DESCRIPTION_LENGTH;
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
          description: 'x'.repeat(maxLength + 1),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('nie może przekraczać');
        }
      });

      it('should accept null description', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
          description: null,
        });
        expect(result.success).toBe(true);
      });
    });

    describe('Tags validation', () => {
      it('should accept valid tags array', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
          tags: ['electronics', 'fragile', 'urgent'],
        });
        expect(result.success).toBe(true);
      });

      it('should accept empty tags array', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
          tags: [],
        });
        expect(result.success).toBe(true);
      });

      it('should reject non-array tags', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
          tags: 'not-an-array',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('tablicą');
        }
      });

      it('should accept null tags', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
          tags: null,
        });
        expect(result.success).toBe(true);
      });
    });

    describe('UUID validations', () => {
      it('should reject invalid workspace_id UUID', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: 'not-a-uuid',
          name: 'Tools',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format');
        }
      });

      it('should reject invalid location_id UUID', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
          location_id: 'not-a-uuid',
        });
        expect(result.success).toBe(false);
      });

      it('should reject invalid qr_code_id UUID', () => {
        const result = CreateBoxSchema.safeParse({
          workspace_id: validWorkspaceId,
          name: 'Tools',
          qr_code_id: 'not-a-uuid',
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
```

#### `GetBoxesQuerySchema`

Tests for query parameter transformation and validation.

**Key Test Cases:**

| Test ID | Description | Input | Expected Transformation | Notes |
|---------|-------------|-------|------------------------|-------|
| TC-QUERY-001 | Boolean string "true" | `{ is_assigned: "true" }` | `is_assigned: true` | Transform to boolean |
| TC-QUERY-002 | Boolean string "false" | `{ is_assigned: "false" }` | `is_assigned: false` | Transform to boolean |
| TC-QUERY-003 | Limit default | `{}` | `limit: 50` | Default value |
| TC-QUERY-004 | Limit parsing | `{ limit: "25" }` | `limit: 25` | String to number |
| TC-QUERY-005 | Limit max enforcement | `{ limit: "150" }` | ❌ Error | Max 100 |
| TC-QUERY-006 | Offset default | `{}` | `offset: 0` | Default value |
| TC-QUERY-007 | Offset parsing | `{ offset: "10" }` | `offset: 10` | String to number |
| TC-QUERY-008 | Null to undefined | `{ q: null }` | `q: undefined` | Transform null |

**Example Test:**

```typescript
describe('GetBoxesQuerySchema', () => {
  describe('Query string transformations', () => {
    it('should transform "true" string to boolean true', () => {
      const result = GetBoxesQuerySchema.safeParse({
        workspace_id: validWorkspaceId,
        is_assigned: 'true',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_assigned).toBe(true);
      }
    });

    it('should transform "false" string to boolean false', () => {
      const result = GetBoxesQuerySchema.safeParse({
        workspace_id: validWorkspaceId,
        is_assigned: 'false',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_assigned).toBe(false);
      }
    });

    it('should transform null to undefined for optional fields', () => {
      const result = GetBoxesQuerySchema.safeParse({
        workspace_id: validWorkspaceId,
        q: null,
        location_id: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBeUndefined();
        expect(result.data.location_id).toBeUndefined();
      }
    });
  });

  describe('Pagination parameters', () => {
    it('should default limit to 50', () => {
      const result = GetBoxesQuerySchema.safeParse({
        workspace_id: validWorkspaceId,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it('should parse limit string to number', () => {
      const result = GetBoxesQuerySchema.safeParse({
        workspace_id: validWorkspaceId,
        limit: '25',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
      }
    });

    it('should enforce max limit of 100', () => {
      const result = GetBoxesQuerySchema.safeParse({
        workspace_id: validWorkspaceId,
        limit: '150',
      });
      expect(result.success).toBe(false);
    });

    it('should default offset to 0', () => {
      const result = GetBoxesQuerySchema.safeParse({
        workspace_id: validWorkspaceId,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(0);
      }
    });

    it('should parse offset string to number', () => {
      const result = GetBoxesQuerySchema.safeParse({
        workspace_id: validWorkspaceId,
        offset: '10',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(10);
      }
    });

    it('should reject negative offset', () => {
      const result = GetBoxesQuerySchema.safeParse({
        workspace_id: validWorkspaceId,
        offset: '-5',
      });
      expect(result.success).toBe(false);
    });
  });
});
```

#### `UpdateBoxSchema`

**Key Test Case:**
- Must require at least one field to be updated

```typescript
describe('UpdateBoxSchema', () => {
  describe('Partial update validation', () => {
    it('should accept update with single field', () => {
      const result = UpdateBoxSchema.safeParse({ name: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('should accept update with multiple fields', () => {
      const result = UpdateBoxSchema.safeParse({
        name: 'New Name',
        description: 'New description',
        tags: ['new', 'tags'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty update object', () => {
      const result = UpdateBoxSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Przynajmniej jedno pole');
      }
    });

    it('should trim name field', () => {
      const result = UpdateBoxSchema.safeParse({ name: '  New Name  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('New Name');
      }
    });

    it('should validate max description length', () => {
      const maxLength = ValidationRules.boxes.MAX_DESCRIPTION_LENGTH;
      const result = UpdateBoxSchema.safeParse({
        description: 'x'.repeat(maxLength + 1),
      });
      expect(result.success).toBe(false);
    });
  });
});
```

#### `CheckDuplicateBoxSchema`

```typescript
describe('CheckDuplicateBoxSchema', () => {
  it('should accept valid duplicate check request', () => {
    const result = CheckDuplicateBoxSchema.safeParse({
      workspace_id: validWorkspaceId,
      name: 'Tools',
    });
    expect(result.success).toBe(true);
  });

  it('should accept request with exclude_box_id', () => {
    const result = CheckDuplicateBoxSchema.safeParse({
      workspace_id: validWorkspaceId,
      name: 'Tools',
      exclude_box_id: validWorkspaceId,
    });
    expect(result.success).toBe(true);
  });

  it('should trim name', () => {
    const result = CheckDuplicateBoxSchema.safeParse({
      workspace_id: validWorkspaceId,
      name: '  Tools  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Tools');
    }
  });

  it('should enforce name max length of 100', () => {
    const result = CheckDuplicateBoxSchema.safeParse({
      workspace_id: validWorkspaceId,
      name: 'x'.repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('nie może przekraczać 100 znaków');
    }
  });

  it('should reject invalid workspace_id UUID', () => {
    const result = CheckDuplicateBoxSchema.safeParse({
      workspace_id: 'invalid',
      name: 'Tools',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid exclude_box_id UUID', () => {
    const result = CheckDuplicateBoxSchema.safeParse({
      workspace_id: validWorkspaceId,
      name: 'Tools',
      exclude_box_id: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});
```

**Estimated Time:** 5-6 hours
**Coverage Goal:** 100%

---

### Phase 1 Summary

**Total Time:** 14-18 hours (1.5-2 days)
**Files Covered:** 4 critical files
**Test Cases:** ~80-100 test cases
**Coverage Impact:** ~30% of total unit test goal

**Deliverables:**
- ✅ `tests/unit/utils/transliterate.test.ts` (100% coverage)
- ✅ `tests/unit/hooks/usePasswordStrength.test.ts` (100% coverage)
- ✅ `tests/unit/validators/qr-code.validators.test.ts` (100% coverage)
- ✅ `tests/unit/validators/box.validators.test.ts` (100% coverage)

---

## 3. Phase 2: Core Logic (Priority: HIGH)

**Duration:** 2-3 days
**Estimated Effort:** 24-32 hours
**Coverage Impact:** ~40% additional coverage

---

### 3.1 `src/components/hooks/useDebounce.ts`

**Priority:** ⭐⭐⭐⭐ **HIGH**

**Why Test:**
- **Performance-critical** - Used in search functionality
- **Timing-dependent logic** - Tests must handle async behavior
- **Reusable hook** - Used across multiple components
- **Edge cases** - Rapid changes, cleanup, unmounting

**Test Cases:**

| Test ID | Description | Expected Behavior | Test Type |
|---------|-------------|------------------|-----------|
| TC-DEB-001 | Returns initial value immediately | Value available on first render | Sync |
| TC-DEB-002 | Debounces rapid changes | Only last value fires after delay | Async |
| TC-DEB-003 | Respects custom delay | Uses custom delayMs parameter | Async |
| TC-DEB-004 | Cancels previous timeout | Earlier values don't fire | Async |
| TC-DEB-005 | Cleans up on unmount | Timeout cleared when component unmounts | Lifecycle |
| TC-DEB-006 | Handles generic types | Works with strings, numbers, objects | Type safety |

**Example Test Structure:**

```typescript
// tests/unit/hooks/useDebounce.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebounce } from '@/components/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    // Initial value
    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 300 });
    expect(result.current).toBe('initial'); // Still old value

    // Fast-forward time
    vi.advanceTimersByTime(300);
    expect(result.current).toBe('updated'); // Now updated
  });

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'first' } }
    );

    rerender({ value: 'second' });
    vi.advanceTimersByTime(100); // Not enough time

    rerender({ value: 'third' });
    vi.advanceTimersByTime(100); // Still not enough

    expect(result.current).toBe('first'); // Still initial

    vi.advanceTimersByTime(300); // Full delay from last update
    expect(result.current).toBe('third'); // Only last value fires
  });

  it('should respect custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500), // 500ms delay
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    vi.advanceTimersByTime(300);
    expect(result.current).toBe('initial'); // Not yet updated

    vi.advanceTimersByTime(200); // Total 500ms
    expect(result.current).toBe('updated'); // Now updated
  });

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should work with different types', () => {
    // String
    const { result: stringResult } = renderHook(() =>
      useDebounce('text', 300)
    );
    expect(stringResult.current).toBe('text');

    // Number
    const { result: numberResult } = renderHook(() =>
      useDebounce(42, 300)
    );
    expect(numberResult.current).toBe(42);

    // Object
    const obj = { key: 'value' };
    const { result: objectResult } = renderHook(() =>
      useDebounce(obj, 300)
    );
    expect(objectResult.current).toBe(obj);
  });

  it('should use default delay of 300ms when not specified', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value), // No delay specified
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    vi.advanceTimersByTime(299);
    expect(result.current).toBe('initial');

    vi.advanceTimersByTime(1); // Total 300ms
    expect(result.current).toBe('updated');
  });
});
```

**Estimated Time:** 3-4 hours
**Coverage Goal:** 100%

---

### 3.2 `src/lib/validators/location.validators.ts`

**Priority:** ⭐⭐⭐⭐ **HIGH**

**Why Test:**
- **Hierarchical data** - Location tree validation is complex
- **Business rules** - Max depth of 5 levels must be enforced
- **Critical for UX** - Invalid locations break navigation

**Schemas to Test:**
1. `CreateLocationSchema`
2. `UpdateLocationSchema`
3. `GetLocationByIdSchema`
4. `DeleteLocationSchema`

**Key Test Cases:**

```typescript
// tests/unit/validators/location.validators.test.ts
import { describe, it, expect } from 'vitest';
import {
  CreateLocationSchema,
  UpdateLocationSchema,
  GetLocationByIdSchema,
  DeleteLocationSchema
} from '@/lib/validators/location.validators';

describe('Location Validators', () => {
  const validWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';
  const validParentId = '660e8400-e29b-41d4-a716-446655440000';

  describe('CreateLocationSchema', () => {
    it('should accept valid root location (no parent)', () => {
      const result = CreateLocationSchema.safeParse({
        workspace_id: validWorkspaceId,
        name: 'Garage',
        parent_id: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid nested location (with parent)', () => {
      const result = CreateLocationSchema.safeParse({
        workspace_id: validWorkspaceId,
        name: 'Metal Rack',
        parent_id: validParentId,
      });
      expect(result.success).toBe(true);
    });

    it('should trim location name', () => {
      const result = CreateLocationSchema.safeParse({
        workspace_id: validWorkspaceId,
        name: '  Garage  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Garage');
      }
    });

    it('should reject empty name', () => {
      const result = CreateLocationSchema.safeParse({
        workspace_id: validWorkspaceId,
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid workspace_id UUID', () => {
      const result = CreateLocationSchema.safeParse({
        workspace_id: 'invalid',
        name: 'Garage',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid parent_id UUID', () => {
      const result = CreateLocationSchema.safeParse({
        workspace_id: validWorkspaceId,
        name: 'Shelf',
        parent_id: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateLocationSchema', () => {
    it('should accept name update', () => {
      const result = UpdateLocationSchema.safeParse({
        name: 'Updated Garage',
      });
      expect(result.success).toBe(true);
    });

    it('should accept parent_id update', () => {
      const result = UpdateLocationSchema.safeParse({
        parent_id: validParentId,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty update object', () => {
      const result = UpdateLocationSchema.safeParse({});
      expect(result.success).toBe(false);
      // Should require at least one field
    });

    it('should trim updated name', () => {
      const result = UpdateLocationSchema.safeParse({
        name: '  Updated  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated');
      }
    });
  });

  describe('GetLocationByIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = GetLocationByIdSchema.safeParse({
        id: validWorkspaceId,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = GetLocationByIdSchema.safeParse({
        id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = GetLocationByIdSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('DeleteLocationSchema', () => {
    it('should accept valid location ID for deletion', () => {
      const result = DeleteLocationSchema.safeParse({
        id: validWorkspaceId,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for deletion', () => {
      const result = DeleteLocationSchema.safeParse({
        id: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });
});
```

**Estimated Time:** 3-4 hours
**Coverage Goal:** 100%

---

### 3.3 `src/lib/validators/workspace.validators.ts`

**Priority:** ⭐⭐⭐⭐ **HIGH**

**Similar structure to location validators. Test:**
- `CreateWorkspaceSchema`
- `UpdateWorkspaceSchema`
- `AddWorkspaceMemberSchema`
- `RemoveWorkspaceMemberSchema`

**Estimated Time:** 3-4 hours
**Coverage Goal:** 100%

---

### 3.4 `src/lib/services/errors.ts`

**Priority:** ⭐⭐⭐ **MEDIUM-HIGH**

**Why Test:**
- **Error handling** - Critical for UX and debugging
- **Pure functions** - Error transformation logic
- **HTTP status mapping** - Must be correct for API responses

**Example Test Structure:**

```typescript
// tests/unit/services/errors.test.ts
import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  toApiError,
  getHttpStatusFromError
} from '@/lib/services/errors';

describe('Error Classes', () => {
  describe('ValidationError', () => {
    it('should create validation error with message', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ValidationError');
    });

    it('should include details if provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Invalid input', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Not authenticated');
      expect(error.message).toBe('Not authenticated');
      expect(error.name).toBe('AuthenticationError');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new AuthorizationError('Access denied');
      expect(error.message).toBe('Access denied');
      expect(error.name).toBe('AuthorizationError');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.message).toBe('Resource not found');
      expect(error.name).toBe('NotFoundError');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.message).toBe('Resource already exists');
      expect(error.name).toBe('ConflictError');
    });
  });
});

describe('Error Utility Functions', () => {
  describe('getHttpStatusFromError', () => {
    it('should return 400 for ValidationError', () => {
      const error = new ValidationError('Invalid');
      expect(getHttpStatusFromError(error)).toBe(400);
    });

    it('should return 401 for AuthenticationError', () => {
      const error = new AuthenticationError('Unauthorized');
      expect(getHttpStatusFromError(error)).toBe(401);
    });

    it('should return 403 for AuthorizationError', () => {
      const error = new AuthorizationError('Forbidden');
      expect(getHttpStatusFromError(error)).toBe(403);
    });

    it('should return 404 for NotFoundError', () => {
      const error = new NotFoundError('Not found');
      expect(getHttpStatusFromError(error)).toBe(404);
    });

    it('should return 409 for ConflictError', () => {
      const error = new ConflictError('Conflict');
      expect(getHttpStatusFromError(error)).toBe(409);
    });

    it('should return 500 for unknown errors', () => {
      const error = new Error('Generic error');
      expect(getHttpStatusFromError(error)).toBe(500);
    });
  });

  describe('toApiError', () => {
    it('should format ValidationError to API response', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      const apiError = toApiError(error);

      expect(apiError).toEqual({
        error: 'Invalid input',
        details: { field: 'email' },
      });
    });

    it('should format generic Error without details', () => {
      const error = new Error('Something went wrong');
      const apiError = toApiError(error);

      expect(apiError).toEqual({
        error: 'Something went wrong',
      });
    });

    it('should handle errors without message', () => {
      const error = new Error();
      const apiError = toApiError(error);

      expect(apiError.error).toBe('Unknown error');
    });
  });
});
```

**Estimated Time:** 3-4 hours
**Coverage Goal:** 100%

---

### Phase 2 Summary

**Total Time:** 24-32 hours (2-3 days)
**Files Covered:** 4 critical files
**Test Cases:** ~60-80 test cases
**Coverage Impact:** ~40% additional

**Deliverables:**
- ✅ `tests/unit/hooks/useDebounce.test.ts`
- ✅ `tests/unit/validators/location.validators.test.ts`
- ✅ `tests/unit/validators/workspace.validators.test.ts`
- ✅ `tests/unit/services/errors.test.ts`

---

## 4. Phase 3: Extended Coverage (Priority: MEDIUM)

**Duration:** 3-4 days
**Estimated Effort:** 24-32 hours

### Files to Test:

1. **`src/components/hooks/useLocalStorage.ts`**
   - localStorage read/write
   - JSON serialization/deserialization
   - Error handling
   - **Estimated:** 3-4 hours

2. **`src/components/hooks/useFormValidation.ts`**
   - Field validation logic
   - Error state management
   - Touched field tracking
   - **Estimated:** 3-4 hours

3. **`src/components/hooks/useForm.ts`**
   - Form state management
   - onChange handlers
   - Reset functionality
   - **Estimated:** 3-4 hours

4. **`src/lib/services/logger.ts`**
   - Log level filtering
   - Message formatting
   - Context attachment
   - **Estimated:** 3-4 hours

5. **`src/lib/utils/endpoints.ts`**
   - URL construction
   - Query string building
   - Path parameter substitution
   - **Estimated:** 2-3 hours

6. **`src/lib/validation/schemas.ts`**
   - Common validation schemas
   - Email, password, UUID validators
   - **Estimated:** 2-3 hours

7. **`src/lib/validators/export.validators.ts`**
   - Export format validation
   - workspace_id validation
   - **Estimated:** 2 hours

---

## 5. Phase 4: Advanced (Priority: LOW)

**Duration:** 2-3 days
**Estimated Effort:** 16-24 hours

### Files Requiring Mocks:

1. **`src/components/hooks/useFetch.ts`**
   - Requires mocking `fetch` API
   - Loading/error states
   - Request cancellation
   - **Estimated:** 4-5 hours

2. **`src/components/hooks/useTheme.ts`**
   - Requires mocking DOM (localStorage, classList)
   - Theme toggling logic
   - System preference detection
   - **Estimated:** 3-4 hours

3. **`src/lib/api-client.ts`**
   - Requires mocking `fetch` API
   - HTTP method wrappers
   - Error handling
   - Response parsing
   - **Estimated:** 4-5 hours

4. **`src/lib/stores/*.ts`** (theme, workspace, auth stores)
   - Requires mocking Supabase client
   - State management logic
   - **Estimated:** 5-6 hours per store

---

## 6. Test Utilities & Helpers

Create reusable test utilities in `tests/helpers/`:

### 6.1 `tests/helpers/mockData.ts`

```typescript
/**
 * Reusable mock data for tests
 */

export const mockUUIDs = {
  workspace: '550e8400-e29b-41d4-a716-446655440000',
  location: '660e8400-e29b-41d4-a716-446655440000',
  box: '770e8400-e29b-41d4-a716-446655440000',
  qrCode: '880e8400-e29b-41d4-a716-446655440000',
  user: '990e8400-e29b-41d4-a716-446655440000',
};

export const mockQRCodes = {
  valid: 'QR-A1B2C3',
  validNumeric: 'QR-123456',
  validAlpha: 'QR-ABCDEF',
  invalidLowercase: 'QR-abc123',
  invalidShort: 'QR-A1B',
  invalidLong: 'QR-A1B2C3D',
  invalidPrefix: 'QC-A1B2C3',
};

export const mockPasswords = {
  weak: 'abc123',
  medium: 'Password1',
  strong: 'MyP@ssw0rd2024',
  tooShort: 'Abc1!',
  onlyLower: 'abcdefgh',
  onlyUpper: 'ABCDEFGH',
  onlyNumbers: '12345678',
  allCriteria: 'Abc123!@#',
};

export const mockPolishText = {
  lowercase: 'ąćęłńóśźż',
  uppercase: 'ĄĆĘŁŃÓŚŹŻ',
  mixed: 'Garaż Metalowy',
  withSpecialChars: 'Półka #1',
  complex: 'Półka Górna: Narzędzia #3',
};
```

### 6.2 `tests/helpers/zodTestUtils.ts`

```typescript
/**
 * Utilities for testing Zod schemas
 */
import { ZodSchema } from 'zod';

export function expectValid<T>(schema: ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(true);
  return result;
}

export function expectInvalid<T>(
  schema: ZodSchema<T>,
  data: unknown,
  errorMessage?: string
) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(false);

  if (errorMessage && !result.success) {
    expect(result.error.issues[0].message).toContain(errorMessage);
  }

  return result;
}

export function extractData<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error('Schema validation failed');
  }
  return result.data;
}
```

### 6.3 `tests/helpers/hookTestUtils.ts`

```typescript
/**
 * Utilities for testing React hooks
 */
import { renderHook } from '@testing-library/react';

export function renderHookWithTimers<T>(
  hook: () => T,
  useFakeTimers = true
) {
  if (useFakeTimers) {
    vi.useFakeTimers();
  }

  const result = renderHook(hook);

  return {
    ...result,
    advanceTime: (ms: number) => {
      if (useFakeTimers) {
        vi.advanceTimersByTime(ms);
      }
    },
    cleanup: () => {
      result.unmount();
      if (useFakeTimers) {
        vi.restoreAllMocks();
      }
    },
  };
}
```

---

## 7. Implementation Timeline

### Week 1-2: Phase 1 (Quick Wins)

| Day | Task | Hours | Deliverable |
|-----|------|-------|-------------|
| 1 | `transliterate.ts` tests | 4h | 100% coverage |
| 2 | `usePasswordStrength.ts` tests | 4h | 100% coverage |
| 3 | `qr-code.validators.ts` tests | 4h | 100% coverage |
| 4 | `box.validators.ts` tests (Part 1) | 4h | 50% coverage |
| 5 | `box.validators.ts` tests (Part 2) | 2h | 100% coverage |

**End of Week 1:** 4 files, ~30% total coverage

### Week 3-4: Phase 2 (Core Logic)

| Day | Task | Hours | Deliverable |
|-----|------|-------|-------------|
| 6 | `useDebounce.ts` tests | 4h | 100% coverage |
| 7 | `location.validators.ts` tests | 4h | 100% coverage |
| 8 | `workspace.validators.ts` tests | 4h | 100% coverage |
| 9 | `errors.ts` tests | 4h | 100% coverage |
| 10 | Buffer for fixes | 2h | Catch-up |

**End of Week 2:** 8 files, ~70% total coverage

### Week 5-6: Phase 3 (Extended Coverage)

| Day | Task | Hours | Deliverable |
|-----|------|-------|-------------|
| 11-12 | Hooks (localStorage, formValidation, form) | 10h | 3 files |
| 13-14 | Logger & utils (logger, endpoints, schemas) | 8h | 3 files |
| 15 | Export validators | 2h | 1 file |

**End of Week 3:** 15 files, ~85% total coverage

### Week 7-8: Phase 4 (Advanced) - Optional

| Day | Task | Hours | Deliverable |
|-----|------|-------|-------------|
| 16-17 | Complex hooks (useFetch, useTheme) | 8h | 2 files |
| 18-19 | API client & stores | 10h | 2-3 files |
| 20 | Final polish & documentation | 2h | Complete |

**End of Week 4:** 20+ files, ~90%+ coverage

---

## 8. Success Metrics

### Code Coverage Targets

| Category | Target | Status |
|----------|--------|--------|
| **Utility Functions** | 100% | 🎯 Target |
| **Validators** | 100% | 🎯 Target |
| **Custom Hooks (pure)** | 100% | 🎯 Target |
| **Error Handling** | 100% | 🎯 Target |
| **Overall Unit Coverage** | 80% | 🎯 Target |

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Test Execution Time** | < 10 seconds | Vitest output |
| **Flaky Test Rate** | < 2% | CI/CD metrics |
| **Test Maintainability** | High | Code review feedback |
| **Documentation** | Complete | Inline comments + README |

### Test Quality Checklist

- ✅ All tests follow Arrange-Act-Assert pattern
- ✅ Tests are isolated (no shared state)
- ✅ Tests have descriptive names
- ✅ Edge cases are covered
- ✅ Error cases are tested
- ✅ Tests run fast (< 10s total)
- ✅ No console warnings/errors
- ✅ Coverage reports generated
- ✅ CI/CD integration working

---

## 9. Conclusion

This unit test plan provides a clear, prioritized roadmap for achieving comprehensive test coverage for the Storage & Box Organizer application. By following the phased approach:

**Phase 1 (1-2 days):** Focus on quick wins with pure functions and critical validators
**Phase 2 (2-3 days):** Cover core business logic and validation rules
**Phase 3 (3-4 days):** Extend coverage to hooks and utility functions
**Phase 4 (2-3 days):** Handle advanced cases requiring mocks (optional)

**Total Estimated Time:** 8-12 days of focused development

**Expected Outcome:**
- 80%+ code coverage for service layer and validation logic
- 100% coverage for critical utility functions and validators
- Robust test suite preventing regressions
- Foundation for continued test-driven development

**Next Steps:**
1. Review and approve this plan
2. Set up test utilities and helpers
3. Begin Phase 1 implementation
4. Track progress using coverage reports
5. Iterate and refine based on findings

---

**End of Unit Test Implementation Plan**
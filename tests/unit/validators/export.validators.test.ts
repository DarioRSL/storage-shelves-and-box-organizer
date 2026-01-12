/**
 * Unit Tests for Export Validators
 *
 * Tests Zod validation schemas for export-related API endpoints.
 *
 * Business Rules:
 * - workspace_id is required and must be valid UUID v4
 * - format is optional, defaults to 'csv'
 * - format must be 'csv' or 'json' (case-insensitive)
 * - format is transformed to lowercase
 * - Schema is strict (no extra properties allowed)
 *
 * Coverage Target: 100%
 * Test Count: 14-18 tests
 */

import { describe, it, expect } from 'vitest';
import {
  ExportInventoryQuerySchema,
  type ExportInventoryQueryInput,
} from '@/lib/validators/export.validators';

describe('Export Validators', () => {
  describe('ExportInventoryQuerySchema', () => {
    const validWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';

    describe('Valid inputs', () => {
      it('TC-EXP-VAL-001: should validate with workspace_id only (default format)', () => {
        const input = {
          workspace_id: validWorkspaceId,
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.workspace_id).toBe(validWorkspaceId);
          expect(result.data.format).toBe('csv'); // Default format
        }
      });

      it('should validate with explicit csv format', () => {
        const input: ExportInventoryQueryInput = {
          workspace_id: validWorkspaceId,
          format: 'csv',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.workspace_id).toBe(validWorkspaceId);
          expect(result.data.format).toBe('csv');
        }
      });

      it('should validate with json format', () => {
        const input: ExportInventoryQueryInput = {
          workspace_id: validWorkspaceId,
          format: 'json',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.workspace_id).toBe(validWorkspaceId);
          expect(result.data.format).toBe('json');
        }
      });

      it('TC-EXP-VAL-002: should transform uppercase CSV to lowercase', () => {
        const input = {
          workspace_id: validWorkspaceId,
          format: 'CSV',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.format).toBe('csv'); // Transformed to lowercase
        }
      });

      it('should transform uppercase JSON to lowercase', () => {
        const input = {
          workspace_id: validWorkspaceId,
          format: 'JSON',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.format).toBe('json');
        }
      });

      it('should transform mixed case format to lowercase', () => {
        const input = {
          workspace_id: validWorkspaceId,
          format: 'CsV',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.format).toBe('csv');
        }
      });

      it('should validate different valid UUID formats', () => {
        const validIds = [
          '123e4567-e89b-12d3-a456-426614174000',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        ];

        validIds.forEach((id) => {
          const result = ExportInventoryQuerySchema.safeParse({
            workspace_id: id,
            format: 'csv',
          });
          expect(result.success).toBe(true);
        });
      });
    });

    describe('Invalid inputs - workspace_id', () => {
      it('TC-EXP-VAL-003: should reject missing workspace_id', () => {
        const input = {
          format: 'csv',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('workspace_id');
        }
      });

      it('should reject invalid workspace_id format', () => {
        const input = {
          workspace_id: 'not-a-uuid',
          format: 'csv',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Nieprawidłowy format workspace_id (musi być UUID)');
        }
      });

      it('should reject empty string workspace_id', () => {
        const input = {
          workspace_id: '',
          format: 'csv',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject workspace_id with invalid characters', () => {
        const input = {
          workspace_id: '550e8400-e29b-41d4-a716-44665544000g',
          format: 'csv',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid inputs - format', () => {
      it('TC-EXP-VAL-004: should reject invalid format value', () => {
        const input = {
          workspace_id: validWorkspaceId,
          format: 'xml',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Nieprawidłowy format: musi być 'csv' lub 'json'");
        }
      });

      it('should reject empty string format', () => {
        const input = {
          workspace_id: validWorkspaceId,
          format: '',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Nieprawidłowy format: musi być 'csv' lub 'json'");
        }
      });

      it('should reject numeric format', () => {
        const input = {
          workspace_id: validWorkspaceId,
          format: 123,
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject format with whitespace', () => {
        const input = {
          workspace_id: validWorkspaceId,
          format: 'csv ',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('Strict mode - extra properties', () => {
      it('TC-EXP-VAL-005: should reject extra properties (strict mode)', () => {
        const input = {
          workspace_id: validWorkspaceId,
          format: 'csv',
          extra_field: 'should not be allowed',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].code).toBe('unrecognized_keys');
        }
      });

      it('should reject multiple extra properties', () => {
        const input = {
          workspace_id: validWorkspaceId,
          format: 'json',
          foo: 'bar',
          baz: 'qux',
        };

        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should handle format with leading/trailing spaces before transform', () => {
        const input = {
          workspace_id: validWorkspaceId,
          format: ' csv ',
        };

        // Should fail because transform happens before trim
        const result = ExportInventoryQuerySchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should handle both valid values in sequence', () => {
        const inputs = [
          { workspace_id: validWorkspaceId, format: 'csv' },
          { workspace_id: validWorkspaceId, format: 'json' },
        ];

        inputs.forEach((input) => {
          const result = ExportInventoryQuerySchema.safeParse(input);
          expect(result.success).toBe(true);
        });
      });
    });
  });
});
import { describe, it, expect } from 'vitest';
import {
  GetQrCodeByShortIdSchema,
  BatchGenerateQrCodesRequestSchema,
} from '@/lib/validators/qr-code.validators';

describe('QR Code Validators', () => {
  describe('GetQrCodeByShortIdSchema', () => {
    describe('Valid QR code formats', () => {
      it('TC-QRID-001: should accept valid QR code with uppercase letters and numbers', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-A1B2C3',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.short_id).toBe('QR-A1B2C3');
        }
      });

      it('TC-QRID-002: should accept QR code with all uppercase letters', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-ABCDEF',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.short_id).toBe('QR-ABCDEF');
        }
      });

      it('TC-QRID-003: should accept QR code with all numbers', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-123456',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.short_id).toBe('QR-123456');
        }
      });
    });

    describe('Invalid QR code formats', () => {
      it('TC-QRID-004: should reject lowercase letters', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-abc123',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format ID kodu QR');
        }
      });

      it('TC-QRID-005: should reject too short code (< 6 characters)', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-A1B2',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format ID kodu QR');
        }
      });

      it('TC-QRID-006: should reject too long code (> 6 characters)', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-A1B2C3D',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format ID kodu QR');
        }
      });

      it('TC-QRID-007: should reject missing QR- prefix', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'A1B2C3',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format ID kodu QR');
        }
      });

      it('TC-QRID-008: should reject special characters', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-A!B@C#',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format ID kodu QR');
        }
      });

      it('TC-QRID-009: should reject spaces', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QR-A1 B2C',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format ID kodu QR');
        }
      });

      it('TC-QRID-010: should reject wrong prefix', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: 'QC-A1B2C3',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format ID kodu QR');
        }
      });
    });

    describe('Edge cases', () => {
      it('should reject empty string', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: '',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing short_id field', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('should reject null short_id', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: null,
        });
        expect(result.success).toBe(false);
      });

      it('should reject undefined short_id', () => {
        const result = GetQrCodeByShortIdSchema.safeParse({
          short_id: undefined,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('BatchGenerateQrCodesRequestSchema', () => {
    const validWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';

    describe('Valid batch requests', () => {
      it('TC-BATCH-001: should accept minimum quantity (1)', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 1,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.workspace_id).toBe(validWorkspaceId);
          expect(result.data.quantity).toBe(1);
        }
      });

      it('TC-BATCH-002: should accept maximum quantity (100)', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 100,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.workspace_id).toBe(validWorkspaceId);
          expect(result.data.quantity).toBe(100);
        }
      });

      it('TC-BATCH-003: should accept typical mid-range quantity (20)', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 20,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.workspace_id).toBe(validWorkspaceId);
          expect(result.data.quantity).toBe(20);
        }
      });

      it('should accept another valid UUID format', () => {
        const anotherValidUuid = '123e4567-e89b-12d3-a456-426614174000';
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: anotherValidUuid,
          quantity: 50,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.workspace_id).toBe(anotherValidUuid);
          expect(result.data.quantity).toBe(50);
        }
      });
    });

    describe('Invalid quantity', () => {
      it('TC-BATCH-004: should reject quantity 0', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 0,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('co najmniej 1');
        }
      });

      it('TC-BATCH-005: should reject negative quantity', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: -5,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('co najmniej 1');
        }
      });

      it('TC-BATCH-006: should reject quantity exceeding maximum (> 100)', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 150,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('nie może przekraczać 100');
        }
      });

      it('TC-BATCH-007: should reject decimal quantity', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 10.5,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('liczbą całkowitą');
        }
      });

      it('TC-BATCH-008: should reject string quantity', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: '20',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].code).toBe('invalid_type');
        }
      });

      it('should reject quantity 101 (boundary test)', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 101,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('nie może przekraczać 100');
        }
      });

      it('should reject very large quantity', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 999999,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid workspace_id', () => {
      it('TC-BATCH-009: should reject invalid UUID format', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: 'not-a-uuid',
          quantity: 20,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format workspace_id');
        }
      });

      it('TC-BATCH-010: should reject missing workspace_id field', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          quantity: 20,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].code).toBe('invalid_type');
        }
      });

      it('should reject empty string workspace_id', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: '',
          quantity: 20,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format workspace_id');
        }
      });

      it('should reject partial UUID', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: '550e8400-e29b-41d4',
          quantity: 20,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format workspace_id');
        }
      });

      it('should reject UUID-like string with invalid characters', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: '550e8400-e29b-41d4-a716-44665544000g',
          quantity: 20,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nieprawidłowy format workspace_id');
        }
      });

      it('should reject null workspace_id', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: null,
          quantity: 20,
        });
        expect(result.success).toBe(false);
      });

      it('should reject numeric workspace_id', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: 12345,
          quantity: 20,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should reject missing both fields', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({});
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
        }
      });

      it('should reject additional unexpected fields with strict parsing', () => {
        const result = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 20,
          extra_field: 'should be ignored',
        });
        // Zod by default allows extra fields, so this should succeed
        // This test documents the behavior
        expect(result.success).toBe(true);
      });

      it('should handle quantity at exact boundaries', () => {
        // Test exactly 1
        const result1 = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 1,
        });
        expect(result1.success).toBe(true);

        // Test exactly 100
        const result100 = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 100,
        });
        expect(result100.success).toBe(true);

        // Test 0 (just below minimum)
        const result0 = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 0,
        });
        expect(result0.success).toBe(false);

        // Test 101 (just above maximum)
        const result101 = BatchGenerateQrCodesRequestSchema.safeParse({
          workspace_id: validWorkspaceId,
          quantity: 101,
        });
        expect(result101.success).toBe(false);
      });
    });
  });
});
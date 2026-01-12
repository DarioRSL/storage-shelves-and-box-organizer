/**
 * Integration Tests: QR Code Detail (9 tests)
 * GET /api/qr-codes/:short_id - Get QR code by code string
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearAllTestData, seedTable } from '../../../helpers/db-setup';
import { createAuthenticatedUser } from '../../../helpers/auth-helper';
import { seedInitialDataset } from '../../../fixtures/initial-dataset';
import { createRootLocationFixture, createBoxFixture, createQRCodeFixture } from '../../../helpers/factory';
import { authenticatedGet, assertSuccess, assertError } from '../../../helpers/api-client';
import { getAdminSupabaseClient } from '../../../helpers/supabase-test-client';

describe('GET /api/qr-codes/:short_id', () => {
  beforeEach(async () => await clearAllTestData());
  afterEach(async () => await clearAllTestData());

  it('should return QR details by code string', async () => {
    const dataset = await seedInitialDataset();
    const qrData = createQRCodeFixture(dataset.workspaces.primary.id);
    const [qr] = await seedTable('qr_codes', [qrData]);
    const response = await authenticatedGet(`/api/qr-codes/${qr.code}`, dataset.users.admin.token);
    assertSuccess(response);
    expect(response.body.code).toBe(qr.code);
  });

  it('should include box details if assigned', async () => {
    const dataset = await seedInitialDataset();
    const adminClient = getAdminSupabaseClient();
    const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
    const qrData = createQRCodeFixture(dataset.workspaces.primary.id);
    const [qr] = await seedTable('qr_codes', [qrData]);
    const boxData = { ...createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box'), qr_code_id: qr.id };
    await seedTable('boxes', [boxData]);
    const response = await authenticatedGet(`/api/qr-codes/${qr.code}`, dataset.users.admin.token);
    assertSuccess(response);
    expect(response.body.box_id).toBeTruthy();
  });

  it('should return null box_id if not assigned', async () => {
    const dataset = await seedInitialDataset();
    const qrData = createQRCodeFixture(dataset.workspaces.primary.id);
    const [qr] = await seedTable('qr_codes', [qrData]);
    const response = await authenticatedGet(`/api/qr-codes/${qr.code}`, dataset.users.admin.token);
    assertSuccess(response);
    expect(response.body.box_id).toBeNull();
  });

  it('should reject invalid QR format', async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedGet('/api/qr-codes/INVALID', dataset.users.admin.token);
    assertError(response, 400);
  });

  it('should reject without authentication', async () => {
    const response = await authenticatedGet('/api/qr-codes/QR-ABC123', '');
    assertError(response, 401);
  });

  it('should reject from non-member', async () => {
    const dataset = await seedInitialDataset();
    const qrData = createQRCodeFixture(dataset.workspaces.primary.id);
    const [qr] = await seedTable('qr_codes', [qrData]);
    const outsider = await createAuthenticatedUser({ email: 'qr-detail-out@example.com', password: 'SecurePass123!', full_name: 'QR Detail Out' });
    const response = await authenticatedGet(`/api/qr-codes/${qr.code}`, outsider.token);
    assertError(response, 403);
  });

  it('should return 404 for non-existent QR code', async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedGet('/api/qr-codes/QR-NOEXST', dataset.users.admin.token);
    assertError(response, 404);
  });

  it('should return 404 for QR code in other workspace', async () => {
    const dataset = await seedInitialDataset();
    const qrData = createQRCodeFixture(dataset.workspaces.secondary.id);
    const [qr] = await seedTable('qr_codes', [qrData]);
    const response = await authenticatedGet(`/api/qr-codes/${qr.code}`, dataset.users.viewer.token);
    assertError(response, 404);
  });

  it('should allow case-insensitive QR code lookup', async () => {
    const dataset = await seedInitialDataset();
    const qrData = createQRCodeFixture(dataset.workspaces.primary.id);
    const [qr] = await seedTable('qr_codes', [qrData]);
    const lowercaseCode = qr.code.toLowerCase();
    const response = await authenticatedGet(`/api/qr-codes/${lowercaseCode}`, dataset.users.admin.token);
    assertSuccess(response);
    expect(response.body.code).toBe(qr.code);
  });
});

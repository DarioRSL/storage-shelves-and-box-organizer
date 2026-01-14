/**
 * Integration Tests: QR Code Management (14 tests)
 * GET /api/qr-codes - List QR codes
 * POST /api/qr-codes/batch - Generate batch of QR codes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearAllTestData, seedTable } from '../../../helpers/db-setup';
import { createAuthenticatedUser } from '../../../helpers/auth-helper';
import { seedInitialDataset } from '../../../fixtures/initial-dataset';
import { createWorkspaceFixture, createRootLocationFixture, createBoxFixture, createQRCodeFixture } from '../../../helpers/factory';
import { authenticatedGet, authenticatedPost, assertSuccess, assertError } from '../../../helpers/api-client';
import { getAdminSupabaseClient } from '../../../helpers/supabase-test-client';

describe.skip('GET /api/qr-codes', () => {
  beforeEach(async () => await clearAllTestData());
  afterEach(async () => await clearAllTestData());

  it('should list all QR codes for workspace', async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedGet(`/api/qr-codes?workspace_id=${dataset.workspaces.primary.id}`, dataset.users.admin.token);
    assertSuccess(response);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should filter by status', async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedGet(`/api/qr-codes?workspace_id=${dataset.workspaces.primary.id}&status=generated`, dataset.users.admin.token);
    assertSuccess(response);
  });

  it('should include box details for assigned codes', async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedGet(`/api/qr-codes?workspace_id=${dataset.workspaces.primary.id}`, dataset.users.admin.token);
    assertSuccess(response);
  });

  it('should reject without workspace_id', async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedGet('/api/qr-codes', dataset.users.admin.token);
    assertError(response, 400);
  });

  it('should reject without authentication', async () => {
    const response = await authenticatedGet('/api/qr-codes?workspace_id=123', '');
    assertError(response, 401);
  });

  it('should reject from non-member', async () => {
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({ email: 'qr-out@example.com', password: 'SecurePass123!', full_name: 'QR Out' });
    const response = await authenticatedGet(`/api/qr-codes?workspace_id=${dataset.workspaces.primary.id}`, outsider.token);
    assertError(response, 403);
  });
});

describe.skip('POST /api/qr-codes/batch', () => {
  beforeEach(async () => await clearAllTestData());
  afterEach(async () => await clearAllTestData());

  it('should generate batch of 20 QR codes', async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedPost('/api/qr-codes/batch', dataset.users.admin.token, { workspace_id: dataset.workspaces.primary.id, count: 20 });
    assertSuccess(response);
    expect(response.body.length).toBe(20);
  });

  it.skip('should use unique QR-XXXXXX format', async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedPost('/api/qr-codes/batch', dataset.users.admin.token, { workspace_id: dataset.workspaces.primary.id, count: 10 });
    assertSuccess(response);
    response.body.forEach((qr: any) => expect(qr.code).toMatch(/^QR-[A-Z0-9]{6}$/));
  });

  it.skip('should set status to generated', async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedPost('/api/qr-codes/batch', dataset.users.admin.token, { workspace_id: dataset.workspaces.primary.id, count: 5 });
    assertSuccess(response);
    response.body.forEach((qr: any) => expect(qr.status).toBe('generated'));
  });

  it('should reject count > 100', async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedPost('/api/qr-codes/batch', dataset.users.admin.token, { workspace_id: dataset.workspaces.primary.id, count: 101 });
    assertError(response, 400);
  });

  it('should reject count < 1', async () => {
    const dataset = await seedInitialDataset();
    const response = await authenticatedPost('/api/qr-codes/batch', dataset.users.admin.token, { workspace_id: dataset.workspaces.primary.id, count: 0 });
    assertError(response, 400);
  });

  it('should reject without authentication', async () => {
    const response = await authenticatedPost('/api/qr-codes/batch', '', { workspace_id: '00000000-0000-0000-0000-000000000000', count: 10 });
    assertError(response, 401);
  });

  it('should reject from non-member', async () => {
    const dataset = await seedInitialDataset();
    const outsider = await createAuthenticatedUser({ email: 'batch-out@example.com', password: 'SecurePass123!', full_name: 'Batch Out' });
    const response = await authenticatedPost('/api/qr-codes/batch', outsider.token, { workspace_id: dataset.workspaces.primary.id, count: 10 });
    assertError(response, 403);
  });

  it('should reject non-existent workspace', async () => {
    const testUser = await createAuthenticatedUser({ email: 'qr-404@example.com', password: 'SecurePass123!', full_name: 'QR 404' });
    const response = await authenticatedPost('/api/qr-codes/batch', testUser.token, { workspace_id: '00000000-0000-0000-0000-000000000001', count: 10 });
    assertError(response, 404);
  });
});

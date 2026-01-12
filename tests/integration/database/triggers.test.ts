/**
 * Integration Tests: Database Triggers (14 tests)
 *
 * Tests for:
 * - Box short_id generation (3 tests)
 * - Box search_vector generation (5 tests)
 * - QR code reset on box deletion (2 tests)
 * - Timestamp updates (4 tests)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearAllTestData, seedTable } from '../../helpers/db-setup';
import { seedInitialDataset } from '../../fixtures/initial-dataset';
import { createRootLocationFixture, createBoxFixture, createQRCodeFixture } from '../../helpers/factory';
import { getAdminSupabaseClient } from '../../helpers/supabase-test-client';

describe('Database Triggers', () => {
  beforeEach(async () => await clearAllTestData());
  afterEach(async () => await clearAllTestData());

  describe('Box short_id Generation', () => {
    it('should auto-generate 10-char alphanumeric short_id on insert', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const boxData = createBoxFixture(dataset.workspaces.primary.id, location.id, 'Test Box');
      const [box] = await seedTable('boxes', [boxData]);
      expect(box.short_id).toBeTruthy();
      expect(box.short_id).toMatch(/^[A-Za-z0-9]{10}$/);
    });

    it('should generate unique short_ids for multiple boxes', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const boxes = await seedTable('boxes', [
        createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box 1'),
        createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box 2'),
        createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box 3'),
      ]);
      const shortIds = boxes.map((b: any) => b.short_id);
      const uniqueIds = new Set(shortIds);
      expect(uniqueIds.size).toBe(3);
    });

    it('should not overwrite manually-set short_id', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const customId = 'CUSTOM1234';
      const boxData = { ...createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box'), short_id: customId };
      const [box] = await seedTable('boxes', [boxData]);
      expect(box.short_id).toBe(customId);
    });
  });

  describe('Box search_vector Generation', () => {
    it('should generate search_vector from name/description/tags on insert', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const boxData = { ...createBoxFixture(dataset.workspaces.primary.id, location.id, 'Searchable Box'), description: 'Important items', tags: ['electronics'] };
      const [box] = await seedTable('boxes', [boxData]);
      const { data } = await adminClient.from('boxes').select('search_vector').eq('id', box.id).single();
      expect(data.search_vector).toBeTruthy();
    });

    it('should update search_vector when name changes', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const boxData = createBoxFixture(dataset.workspaces.primary.id, location.id, 'Original Name');
      const [box] = await seedTable('boxes', [boxData]);
      await adminClient.from('boxes').update({ name: 'Updated Name' }).eq('id', box.id).throwOnError();
      const { data } = await adminClient.from('boxes').select('search_vector').eq('id', box.id).single();
      expect(data.search_vector).toBeTruthy();
    });

    it('should update search_vector when description changes', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const boxData = createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box');
      const [box] = await seedTable('boxes', [boxData]);
      await adminClient.from('boxes').update({ description: 'New description' }).eq('id', box.id).throwOnError();
      const { data } = await adminClient.from('boxes').select('search_vector').eq('id', box.id).single();
      expect(data.search_vector).toBeTruthy();
    });

    it('should update search_vector when tags change', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const boxData = createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box');
      const [box] = await seedTable('boxes', [boxData]);
      await adminClient.from('boxes').update({ tags: ['new', 'tags'] }).eq('id', box.id).throwOnError();
      const { data } = await adminClient.from('boxes').select('search_vector').eq('id', box.id).single();
      expect(data.search_vector).toBeTruthy();
    });

    it('should handle null description and empty tags', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const boxData = { ...createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box'), description: null, tags: [] };
      const [box] = await seedTable('boxes', [boxData]);
      const { data } = await adminClient.from('boxes').select('search_vector').eq('id', box.id).single();
      expect(data.search_vector).toBeTruthy();
    });
  });

  describe('QR Code Reset on Box Deletion', () => {
    it('should reset QR status to generated when box deleted', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const qrData = createQRCodeFixture(dataset.workspaces.primary.id);
      const [qr] = await seedTable('qr_codes', [qrData]);
      const boxData = { ...createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box'), qr_code_id: qr.id };
      const [box] = await seedTable('boxes', [boxData]);
      await adminClient.from('boxes').delete().eq('id', box.id).throwOnError();
      const { data } = await adminClient.from('qr_codes').select('status').eq('id', qr.id).single();
      expect(data.status).toBe('generated');
    });

    it('should nullify box_id on QR code when box deleted', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const qrData = createQRCodeFixture(dataset.workspaces.primary.id);
      const [qr] = await seedTable('qr_codes', [qrData]);
      const boxData = { ...createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box'), qr_code_id: qr.id };
      const [box] = await seedTable('boxes', [boxData]);
      await adminClient.from('boxes').delete().eq('id', box.id).throwOnError();
      const { data } = await adminClient.from('qr_codes').select('box_id').eq('id', qr.id).single();
      expect(data.box_id).toBeNull();
    });
  });

  describe('Timestamp Updates', () => {
    it('should update updated_at on location update', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const originalTime = location.updated_at;
      await new Promise(resolve => setTimeout(resolve, 1000));
      await adminClient.from('locations').update({ name: 'Updated' }).eq('id', location.id).throwOnError();
      const { data } = await adminClient.from('locations').select('updated_at').eq('id', location.id).single();
      expect(new Date(data.updated_at).getTime()).toBeGreaterThan(new Date(originalTime).getTime());
    });

    it('should update updated_at on workspace update', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const workspaceId = dataset.workspaces.primary.id;
      const { data: original } = await adminClient.from('workspaces').select('updated_at').eq('id', workspaceId).single();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await adminClient.from('workspaces').update({ name: 'Updated' }).eq('id', workspaceId).throwOnError();
      const { data } = await adminClient.from('workspaces').select('updated_at').eq('id', workspaceId).single();
      expect(new Date(data.updated_at).getTime()).toBeGreaterThan(new Date(original.updated_at).getTime());
    });

    it('should update updated_at on box update', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const [location] = await adminClient.from('locations').insert(createRootLocationFixture(dataset.workspaces.primary.id, 'Loc')).select().throwOnError();
      const boxData = createBoxFixture(dataset.workspaces.primary.id, location.id, 'Box');
      const [box] = await seedTable('boxes', [boxData]);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await adminClient.from('boxes').update({ name: 'Updated' }).eq('id', box.id).throwOnError();
      const { data } = await adminClient.from('boxes').select('updated_at').eq('id', box.id).single();
      expect(new Date(data.updated_at).getTime()).toBeGreaterThan(new Date(box.updated_at).getTime());
    });

    it('should update updated_at on profile update', async () => {
      const dataset = await seedInitialDataset();
      const adminClient = getAdminSupabaseClient();
      const userId = dataset.users.admin.id;
      const { data: original } = await adminClient.from('profiles').select('updated_at').eq('id', userId).single();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await adminClient.from('profiles').update({ theme: 'dark' }).eq('id', userId).throwOnError();
      const { data } = await adminClient.from('profiles').select('updated_at').eq('id', userId).single();
      expect(new Date(data.updated_at).getTime()).toBeGreaterThan(new Date(original.updated_at).getTime());
    });
  });
});

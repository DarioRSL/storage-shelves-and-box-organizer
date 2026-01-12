/**
 * Integration Tests: Location Detail Operations
 *
 * Tests for:
 * - GET /api/locations/:id - Get location details
 * - PATCH /api/locations/:id - Update location
 * - DELETE /api/locations/:id - Soft delete location
 *
 * Coverage:
 * - Location detail retrieval
 * - Location update (name, description)
 * - ltree path regeneration on update
 * - Soft delete with cascade to children
 * - Box unlinking on delete
 * - RLS policy enforcement
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearAllTestData, seedTable } from '../../../helpers/db-setup';
import { createAuthenticatedUser } from '../../../helpers/auth-helper';
import { seedInitialDataset } from '../../../fixtures/initial-dataset';
import { createRootLocationFixture, createBoxFixture } from '../../../helpers/factory';
import {
  authenticatedGet,
  authenticatedPatch,
  authenticatedDelete,
  assertSuccess,
  assertError,
  extractId,
} from '../../../helpers/api-client';
import { getAdminSupabaseClient } from '../../../helpers/supabase-test-client';

describe('GET /api/locations/:id', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe('Success Cases', () => {
    it('should return location details for member', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Test Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Act
      const response = await authenticatedGet(`/api/locations/${location.id}`, adminUser.token);

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(location.id);
      expect(response.body.name).toBe('Test Location');
      expect(response.body.workspace_id).toBe(primaryWorkspaceId);
    });

    it('should include location metadata', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Metadata Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Act
      const response = await authenticatedGet(`/api/locations/${location.id}`, adminUser.token);

      // Assert
      assertSuccess(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('workspace_id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('is_deleted');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
    });

    it('should include child locations count', async () => {
      // Arrange: Create parent with children
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const parentData = createRootLocationFixture(primaryWorkspaceId, 'Parent');
      const [parent] = await adminClient
        .from('locations')
        .insert(parentData)
        .select()
        .throwOnError();

      // Create 2 children
      await adminClient
        .from('locations')
        .insert([
          {
            workspace_id: primaryWorkspaceId,
            name: 'Child1',
            path: `${parent.path}.child1`,
          },
          {
            workspace_id: primaryWorkspaceId,
            name: 'Child2',
            path: `${parent.path}.child2`,
          },
        ])
        .throwOnError();

      // Act
      const response = await authenticatedGet(`/api/locations/${parent.id}`, adminUser.token);

      // Assert: Should include child count
      assertSuccess(response);
      expect(response.body.child_count || response.body.children?.length).toBe(2);
    });

    it('should include box count for location', async () => {
      // Arrange: Create location with boxes
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Location With Boxes');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Create 3 boxes in this location
      const boxData = [
        createBoxFixture(primaryWorkspaceId, location.id, 'Box 1'),
        createBoxFixture(primaryWorkspaceId, location.id, 'Box 2'),
        createBoxFixture(primaryWorkspaceId, location.id, 'Box 3'),
      ];
      await seedTable('boxes', boxData);

      // Act
      const response = await authenticatedGet(`/api/locations/${location.id}`, adminUser.token);

      // Assert: Should include box count
      assertSuccess(response);
      expect(response.body.box_count || response.body.boxes?.length).toBe(3);
    });
  });

  describe('Authentication Errors (401)', () => {
    it('should reject request without authentication', async () => {
      // Act
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const response = await authenticatedGet(`/api/locations/${fakeId}`, '');

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      // Act
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const response = await authenticatedGet(`/api/locations/${fakeId}`, 'invalid.jwt.token');

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authorization Errors (403)', () => {
    it('should reject request from non-member', async () => {
      // Arrange: Create location and outsider
      const dataset = await seedInitialDataset();
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Protected Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      const outsider = await createAuthenticatedUser({
        email: 'location-detail-outsider@example.com',
        password: 'SecurePass123!',
        full_name: 'Location Detail Outsider',
      });

      // Act: Outsider tries to access location
      const response = await authenticatedGet(`/api/locations/${location.id}`, outsider.token);

      // Assert
      assertError(response, 403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Not Found Errors (404)', () => {
    it('should return 404 for non-existent location', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      // Act: Try to get non-existent location
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const response = await authenticatedGet(`/api/locations/${fakeId}`, adminUser.token);

      // Assert
      assertError(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for soft-deleted location', async () => {
      // Arrange: Create and soft delete location
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Deleted Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Soft delete
      await adminClient
        .from('locations')
        .update({ is_deleted: true })
        .eq('id', location.id)
        .throwOnError();

      // Act
      const response = await authenticatedGet(`/api/locations/${location.id}`, adminUser.token);

      // Assert
      assertError(response, 404);
      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('PATCH /api/locations/:id', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe('Success Cases', () => {
    it('should update location name', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Old Name');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Act: Update name
      const response = await authenticatedPatch(`/api/locations/${location.id}`, adminUser.token, {
        name: 'New Name',
      });

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(response.body.id).toBe(location.id);
    });

    it('should update location description', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Act
      const response = await authenticatedPatch(`/api/locations/${location.id}`, adminUser.token, {
        description: 'Updated description',
      });

      // Assert
      assertSuccess(response);
      expect(response.body.description).toBe('Updated description');
    });

    it('should regenerate ltree path when name changes', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Original Name');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      const oldPath = location.path;

      // Act: Update name
      const response = await authenticatedPatch(`/api/locations/${location.id}`, adminUser.token, {
        name: 'New Location Name',
      });

      // Assert: Path should be regenerated
      assertSuccess(response);
      expect(response.body.path).not.toBe(oldPath);
      expect(response.body.path).toMatch(/^root\.newlocationname$/);
    });

    it('should update child paths recursively when parent path changes', async () => {
      // Arrange: Create parent with children
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const parentData = createRootLocationFixture(primaryWorkspaceId, 'Parent');
      const [parent] = await adminClient
        .from('locations')
        .insert(parentData)
        .select()
        .throwOnError();

      // Create child
      const [child] = await adminClient
        .from('locations')
        .insert({
          workspace_id: primaryWorkspaceId,
          name: 'Child',
          path: `${parent.path}.child`,
        })
        .select()
        .throwOnError();

      // Act: Update parent name (changes path)
      const response = await authenticatedPatch(`/api/locations/${parent.id}`, adminUser.token, {
        name: 'New Parent Name',
      });

      assertSuccess(response);
      const newParentPath = response.body.path;

      // Assert: Child path should be updated
      const { data: updatedChild } = await adminClient
        .from('locations')
        .select('*')
        .eq('id', child.id)
        .single();

      expect(updatedChild.path).toBe(`${newParentPath}.child`);
    });

    it('should update location without changing path if only description changes', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      const oldPath = location.path;

      // Act: Update only description
      const response = await authenticatedPatch(`/api/locations/${location.id}`, adminUser.token, {
        description: 'New description',
      });

      // Assert: Path should remain unchanged
      assertSuccess(response);
      expect(response.body.path).toBe(oldPath);
    });

    it('should allow member to update location in their workspace', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const memberUser = dataset.users.member;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Member Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Act: Member updates location
      const response = await authenticatedPatch(`/api/locations/${location.id}`, memberUser.token, {
        name: 'Updated By Member',
      });

      // Assert
      assertSuccess(response);
      expect(response.body.name).toBe('Updated By Member');
    });
  });

  describe('Validation Errors (400)', () => {
    it('should reject update with empty name', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Act
      const response = await authenticatedPatch(`/api/locations/${location.id}`, adminUser.token, {
        name: '',
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject update with name exceeding max length', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Act: Name > 100 chars
      const longName = 'A'.repeat(101);
      const response = await authenticatedPatch(`/api/locations/${location.id}`, adminUser.token, {
        name: longName,
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject update with description exceeding max length', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Act: Description > 500 chars
      const longDescription = 'A'.repeat(501);
      const response = await authenticatedPatch(`/api/locations/${location.id}`, adminUser.token, {
        description: longDescription,
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication Errors (401)', () => {
    it('should reject update without authentication', async () => {
      // Act
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const response = await authenticatedPatch(`/api/locations/${fakeId}`, '', {
        name: 'Unauthenticated Update',
      });

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject update with invalid token', async () => {
      // Act
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const response = await authenticatedPatch(`/api/locations/${fakeId}`, 'invalid.jwt.token', {
        name: 'Invalid Token Update',
      });

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authorization Errors (403)', () => {
    it('should reject update from non-member', async () => {
      // Arrange: Create location and outsider
      const dataset = await seedInitialDataset();
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Protected Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      const outsider = await createAuthenticatedUser({
        email: 'location-update-outsider@example.com',
        password: 'SecurePass123!',
        full_name: 'Location Update Outsider',
      });

      // Act: Outsider tries to update location
      const response = await authenticatedPatch(`/api/locations/${location.id}`, outsider.token, {
        name: 'Unauthorized Update',
      });

      // Assert
      assertError(response, 403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Not Found Errors (404)', () => {
    it('should return 404 for non-existent location', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      // Act
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const response = await authenticatedPatch(`/api/locations/${fakeId}`, adminUser.token, {
        name: 'Update Non-existent',
      });

      // Assert
      assertError(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for soft-deleted location', async () => {
      // Arrange: Create and soft delete location
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Deleted Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Soft delete
      await adminClient
        .from('locations')
        .update({ is_deleted: true })
        .eq('id', location.id)
        .throwOnError();

      // Act
      const response = await authenticatedPatch(`/api/locations/${location.id}`, adminUser.token, {
        name: 'Update Deleted',
      });

      // Assert
      assertError(response, 404);
      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('DELETE /api/locations/:id', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe('Success Cases', () => {
    it('should soft delete location', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Location To Delete');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Act: Soft delete
      const response = await authenticatedDelete(`/api/locations/${location.id}`, adminUser.token);

      // Assert
      expect(response.status).toBe(204);

      // Verify soft delete (is_deleted=true)
      const { data: deletedLocation } = await adminClient
        .from('locations')
        .select('*')
        .eq('id', location.id)
        .single();

      expect(deletedLocation.is_deleted).toBe(true);
    });

    it('should soft delete child locations recursively', async () => {
      // Arrange: Create parent with children
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const parentData = createRootLocationFixture(primaryWorkspaceId, 'Parent');
      const [parent] = await adminClient
        .from('locations')
        .insert(parentData)
        .select()
        .throwOnError();

      // Create children
      const [child1, child2] = await adminClient
        .from('locations')
        .insert([
          {
            workspace_id: primaryWorkspaceId,
            name: 'Child1',
            path: `${parent.path}.child1`,
          },
          {
            workspace_id: primaryWorkspaceId,
            name: 'Child2',
            path: `${parent.path}.child2`,
          },
        ])
        .select()
        .throwOnError();

      // Act: Delete parent
      const response = await authenticatedDelete(`/api/locations/${parent.id}`, adminUser.token);

      // Assert
      expect(response.status).toBe(204);

      // Verify all children are soft deleted
      const { data: children } = await adminClient
        .from('locations')
        .select('*')
        .in('id', [child1.id, child2.id]);

      expect(children.every((c: any) => c.is_deleted === true)).toBe(true);
    });

    it('should unlink boxes from deleted location', async () => {
      // Arrange: Create location with boxes
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Location With Boxes');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Create boxes in location
      const boxData = [
        createBoxFixture(primaryWorkspaceId, location.id, 'Box 1'),
        createBoxFixture(primaryWorkspaceId, location.id, 'Box 2'),
      ];
      const boxes = await seedTable('boxes', boxData);

      // Act: Delete location
      const response = await authenticatedDelete(`/api/locations/${location.id}`, adminUser.token);

      // Assert
      expect(response.status).toBe(204);

      // Verify boxes are unlinked (location_id set to null)
      const { data: unlinkedBoxes } = await adminClient
        .from('boxes')
        .select('*')
        .in('id', boxes.map((b: any) => b.id));

      expect(unlinkedBoxes.every((b: any) => b.location_id === null)).toBe(true);
    });

    it('should allow member to delete location in their workspace', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const memberUser = dataset.users.member;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Member Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Act: Member deletes location
      const response = await authenticatedDelete(`/api/locations/${location.id}`, memberUser.token);

      // Assert
      expect(response.status).toBe(204);
    });
  });

  describe('Authentication Errors (401)', () => {
    it('should reject delete without authentication', async () => {
      // Act
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const response = await authenticatedDelete(`/api/locations/${fakeId}`, '');

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject delete with invalid token', async () => {
      // Act
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const response = await authenticatedDelete(`/api/locations/${fakeId}`, 'invalid.jwt.token');

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authorization Errors (403)', () => {
    it('should reject delete from non-member', async () => {
      // Arrange: Create location and outsider
      const dataset = await seedInitialDataset();
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Protected Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      const outsider = await createAuthenticatedUser({
        email: 'location-delete-outsider@example.com',
        password: 'SecurePass123!',
        full_name: 'Location Delete Outsider',
      });

      // Act: Outsider tries to delete location
      const response = await authenticatedDelete(`/api/locations/${location.id}`, outsider.token);

      // Assert
      assertError(response, 403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Not Found Errors (404)', () => {
    it('should return 404 for non-existent location', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      // Act
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const response = await authenticatedDelete(`/api/locations/${fakeId}`, adminUser.token);

      // Assert
      assertError(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for already deleted location', async () => {
      // Arrange: Create and soft delete location
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const locationData = createRootLocationFixture(primaryWorkspaceId, 'Deleted Location');
      const [location] = await adminClient
        .from('locations')
        .insert(locationData)
        .select()
        .throwOnError();

      // Soft delete
      await adminClient
        .from('locations')
        .update({ is_deleted: true })
        .eq('id', location.id)
        .throwOnError();

      // Act: Try to delete again
      const response = await authenticatedDelete(`/api/locations/${location.id}`, adminUser.token);

      // Assert
      assertError(response, 404);
      expect(response.body).toHaveProperty('error');
    });
  });
});

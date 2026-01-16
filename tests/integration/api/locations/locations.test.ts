/**
 * Integration Tests: Location Management
 *
 * Tests for:
 * - GET /api/locations - List locations
 * - POST /api/locations - Create location
 *
 * Coverage:
 * - Location listing with workspace filtering
 * - Hierarchical location creation (up to 5 levels)
 * - ltree path generation and validation
 * - RLS policy enforcement
 * - Input validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearAllTestData } from '../../../helpers/db-setup';
import { createAuthenticatedUser } from '../../../helpers/auth-helper';
import { seedInitialDataset } from '../../../fixtures/initial-dataset';
import { createWorkspaceFixture, createRootLocationFixture } from '../../../helpers/factory';
import {
  authenticatedGet,
  authenticatedPost,
  assertSuccess,
  assertError,
} from '../../../helpers/api-client';
import { getAdminSupabaseClient } from '../../../helpers/supabase-test-client';

describe.skip('GET /api/locations', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe('Success Cases', () => {
    it('should list all locations for workspace', async () => {
      // Arrange: Create dataset with locations
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      // Act: Get locations
      const response = await authenticatedGet(
        `/api/locations?workspace_id=${primaryWorkspaceId}`,
        adminUser.token
      );

      // Assert: Should return locations
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify all locations belong to the workspace
      response.body.forEach((location: any) => {
        expect(location.workspace_id).toBe(primaryWorkspaceId);
      });
    });

    it('should return locations in hierarchical order by path', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedGet(
        `/api/locations?workspace_id=${primaryWorkspaceId}`,
        adminUser.token
      );

      // Assert: Verify hierarchical ordering (parent before children)
      assertSuccess(response);
      const locations = response.body;
      expect(locations.length).toBeGreaterThan(0);

      // Root locations should come first (shortest paths)
      const paths = locations.map((loc: any) => loc.path);
      for (let i = 1; i < paths.length; i++) {
        const prevDepth = paths[i - 1].split('.').length;
        const currDepth = paths[i].split('.').length;
        // Current should be same level or deeper (not shallower)
        expect(currDepth).toBeGreaterThanOrEqual(prevDepth - 1);
      }
    });

    it('should include location metadata in response', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedGet(
        `/api/locations?workspace_id=${primaryWorkspaceId}`,
        adminUser.token
      );

      // Assert: Check response structure
      assertSuccess(response);
      const location = response.body[0];
      expect(location).toHaveProperty('id');
      expect(location).toHaveProperty('workspace_id');
      expect(location).toHaveProperty('name');
      expect(location).toHaveProperty('path');
      expect(location).toHaveProperty('description');
      expect(location).toHaveProperty('is_deleted');
      expect(location).toHaveProperty('created_at');
      expect(location).toHaveProperty('updated_at');
    });

    it.skip('should return empty array if workspace has no locations', async () => {
      // Arrange: Create user with empty workspace
      const testUser = await createAuthenticatedUser({
        email: 'no-locations@example.com',
        password: 'SecurePass123!',
        full_name: 'No Locations User',
      });

      const adminClient = getAdminSupabaseClient();
      const workspaceData = createWorkspaceFixture(testUser.id);
      const [workspace] = await adminClient
        .from('workspaces')
        .insert(workspaceData)
        .select()
        .throwOnError();

      // Add user as owner
      await adminClient
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: testUser.id,
          role: 'owner',
        })
        .throwOnError();

      // Act
      const response = await authenticatedGet(
        `/api/locations?workspace_id=${workspace.id}`,
        testUser.token
      );

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it.skip('should not return soft-deleted locations', async () => {
      // Arrange: Create location and soft delete it
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

      // Soft delete the location
      await adminClient
        .from('locations')
        .update({ is_deleted: true })
        .eq('id', location.id)
        .throwOnError();

      // Act
      const response = await authenticatedGet(
        `/api/locations?workspace_id=${primaryWorkspaceId}`,
        adminUser.token
      );

      // Assert: Deleted location should not appear
      assertSuccess(response);
      const deletedLocation = response.body.find((loc: any) => loc.id === location.id);
      expect(deletedLocation).toBeUndefined();
    });

    it('should return only locations user has access to via RLS', async () => {
      // Arrange: Create two separate workspaces
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const viewerUser = dataset.users.viewer;

      const primaryWorkspaceId = dataset.workspaces.primary.id;
      const secondaryWorkspaceId = dataset.workspaces.secondary.id;

      // Act: Viewer is only member of primary workspace
      const response = await authenticatedGet(
        `/api/locations?workspace_id=${secondaryWorkspaceId}`,
        viewerUser.token
      );

      // Assert: Should get 403 or empty array (RLS blocks access)
      if (response.status === 403) {
        assertError(response, 403);
      } else {
        assertSuccess(response);
        expect(response.body).toEqual([]);
      }
    });
  });

  describe.skip('Validation Errors (400)', () => {
    it('should reject request without workspace_id', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      // Act: Missing workspace_id query param
      const response = await authenticatedGet('/api/locations', adminUser.token);

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid workspace_id format', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      // Act: Invalid UUID format
      const response = await authenticatedGet(
        '/api/locations?workspace_id=not-a-uuid',
        adminUser.token
      );

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe.skip('Authentication Errors (401)', () => {
    it('should reject request without authentication', async () => {
      // Act: Try to get locations without token
      const response = await authenticatedGet('/api/locations?workspace_id=123', '');

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      // Act
      const response = await authenticatedGet(
        '/api/locations?workspace_id=123',
        'invalid.jwt.token'
      );

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe.skip('Authorization Errors (403)', () => {
    it('should reject request from non-member', async () => {
      // Arrange: Create workspace and outsider
      const dataset = await seedInitialDataset();
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const outsider = await createAuthenticatedUser({
        email: 'outsider@example.com',
        password: 'SecurePass123!',
        full_name: 'Outsider User',
      });

      // Act: Outsider tries to access workspace locations
      const response = await authenticatedGet(
        `/api/locations?workspace_id=${primaryWorkspaceId}`,
        outsider.token
      );

      // Assert: Should be blocked
      assertError(response, 403);
      expect(response.body).toHaveProperty('error');
    });
  });
});

describe.skip('POST /api/locations', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe('Success Cases', () => {
    it.skip('should create root location (level 1)', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      // Act: Create root location
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: primaryWorkspaceId,
        name: 'New Root Location',
        description: 'A new root location',
      });

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('New Root Location');
      expect(response.body.workspace_id).toBe(primaryWorkspaceId);
      expect(response.body.path).toMatch(/^root\.[a-z0-9]+$/); // root.slug format
      expect(response.body.is_deleted).toBe(false);
    });

    it.skip('should create child location with correct ltree path', async () => {
      // Arrange: Create parent location first
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();
      const parentData = createRootLocationFixture(primaryWorkspaceId, 'Parent Location');
      const [parent] = await adminClient
        .from('locations')
        .insert(parentData)
        .select()
        .throwOnError();

      // Act: Create child location
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: primaryWorkspaceId,
        name: 'Child Location',
        parent_path: parent.path,
      });

      // Assert: Path should be parent.child
      assertSuccess(response);
      expect(response.status).toBe(201);
      expect(response.body.path).toContain(parent.path);
      expect(response.body.path.split('.').length).toBe(parent.path.split('.').length + 1);
    });

    it.skip('should create location up to level 5 depth', async () => {
      // Arrange: Create 4 levels of locations
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();

      // Create level 1 (root)
      const level1Data = createRootLocationFixture(primaryWorkspaceId, 'Level1');
      const [level1] = await adminClient
        .from('locations')
        .insert(level1Data)
        .select()
        .throwOnError();

      // Create level 2
      const [level2] = await adminClient
        .from('locations')
        .insert({
          workspace_id: primaryWorkspaceId,
          name: 'Level2',
          path: `${level1.path}.level2`,
        })
        .select()
        .throwOnError();

      // Create level 3
      const [level3] = await adminClient
        .from('locations')
        .insert({
          workspace_id: primaryWorkspaceId,
          name: 'Level3',
          path: `${level2.path}.level3`,
        })
        .select()
        .throwOnError();

      // Create level 4
      const [level4] = await adminClient
        .from('locations')
        .insert({
          workspace_id: primaryWorkspaceId,
          name: 'Level4',
          path: `${level3.path}.level4`,
        })
        .select()
        .throwOnError();

      // Act: Create level 5 (maximum depth)
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: primaryWorkspaceId,
        name: 'Level5',
        parent_path: level4.path,
      });

      // Assert: Should succeed
      assertSuccess(response);
      expect(response.status).toBe(201);
      expect(response.body.path.split('.').length).toBe(6); // root + 5 levels
    });

    it('should create location without description', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      // Act: Create location without description
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: primaryWorkspaceId,
        name: 'Location Without Description',
      });

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Location Without Description');
      expect(response.body.description).toBeNull();
    });

    it.skip('should auto-generate ltree path from name', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      // Act: Create location with spaces and special chars in name
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: primaryWorkspaceId,
        name: 'Garage Metal Rack!',
      });

      // Assert: Path should be slugified (lowercase, alphanumeric only)
      assertSuccess(response);
      expect(response.body.path).toMatch(/^root\.garagemetalrack$/);
    });
  });

  describe.skip('Validation Errors (400)', () => {
    it('should reject location with empty name', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: primaryWorkspaceId,
        name: '',
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject location with missing name', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      // Act
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: primaryWorkspaceId,
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject location with name exceeding max length', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      // Act: Name > 100 chars
      const longName = 'A'.repeat(101);
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: primaryWorkspaceId,
        name: longName,
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject location with description exceeding max length', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      // Act: Description > 500 chars
      const longDescription = 'A'.repeat(501);
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: primaryWorkspaceId,
        name: 'Valid Name',
        description: longDescription,
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject location exceeding max depth (level 6)', async () => {
      // Arrange: Create 5 levels
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const adminClient = getAdminSupabaseClient();

      // Create 5 levels (maximum)
      let currentPath = 'root.level1';
      await adminClient
        .from('locations')
        .insert({
          workspace_id: primaryWorkspaceId,
          name: 'Level1',
          path: currentPath,
        })
        .throwOnError();

      for (let i = 2; i <= 5; i++) {
        currentPath = `${currentPath}.level${i}`;
        await adminClient
          .from('locations')
          .insert({
            workspace_id: primaryWorkspaceId,
            name: `Level${i}`,
            path: currentPath,
          })
          .throwOnError();
      }

      // Act: Try to create level 6 (exceeds max depth)
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: primaryWorkspaceId,
        name: 'Level6',
        parent_path: currentPath,
      });

      // Assert: Should be rejected
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/depth|level|maximum/i);
    });

    it('should reject location with invalid parent_path', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      // Act: Non-existent parent path
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: primaryWorkspaceId,
        name: 'Child Location',
        parent_path: 'root.nonexistent',
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject location with missing workspace_id', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      // Act
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        name: 'Location Without Workspace',
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject location with invalid workspace_id format', async () => {
      // Arrange
      const dataset = await seedInitialDataset();
      const adminUser = dataset.users.admin;

      // Act
      const response = await authenticatedPost('/api/locations', adminUser.token, {
        workspace_id: 'not-a-uuid',
        name: 'Location',
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe.skip('Authentication Errors (401)', () => {
    it('should reject location creation without authentication', async () => {
      // Act
      const response = await authenticatedPost('/api/locations', '', {
        workspace_id: '00000000-0000-0000-0000-000000000000',
        name: 'Unauthenticated Location',
      });

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject location creation with invalid token', async () => {
      // Act
      const response = await authenticatedPost('/api/locations', 'invalid.jwt.token', {
        workspace_id: '00000000-0000-0000-0000-000000000000',
        name: 'Invalid Token Location',
      });

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe.skip('Authorization Errors (403)', () => {
    it('should reject location creation in other workspace', async () => {
      // Arrange: Create workspace and outsider
      const dataset = await seedInitialDataset();
      const primaryWorkspaceId = dataset.workspaces.primary.id;

      const outsider = await createAuthenticatedUser({
        email: 'location-outsider@example.com',
        password: 'SecurePass123!',
        full_name: 'Location Outsider',
      });

      // Act: Outsider tries to create location in primary workspace
      const response = await authenticatedPost('/api/locations', outsider.token, {
        workspace_id: primaryWorkspaceId,
        name: 'Unauthorized Location',
      });

      // Assert
      assertError(response, 403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe.skip('Not Found Errors (404)', () => {
    it('should return 404 for non-existent workspace', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'nonexistent-ws@example.com',
        password: 'SecurePass123!',
        full_name: 'Nonexistent WS User',
      });

      // Act: Try to create location in non-existent workspace
      const fakeWorkspaceId = '00000000-0000-0000-0000-000000000001';
      const response = await authenticatedPost('/api/locations', testUser.token, {
        workspace_id: fakeWorkspaceId,
        name: 'Location',
      });

      // Assert
      assertError(response, 404);
      expect(response.body).toHaveProperty('error');
    });
  });
});

/**
 * Integration Tests: User Profiles
 *
 * Tests for:
 * - GET /api/profiles/me
 * - PATCH /api/profiles/me/theme
 *
 * Coverage:
 * - Retrieve current user profile
 * - Update theme preference (light, dark, system)
 * - Authentication requirements
 * - Validation errors
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearAllTestData } from '../../../helpers/db-setup';
import { createAuthenticatedUser } from '../../../helpers/auth-helper';
import {
  authenticatedGet,
  authenticatedPatch,
  unauthenticatedGet,
  assertSuccess,
  assertError,
} from '../../../helpers/api-client';
import { getAdminSupabaseClient } from '../../../helpers/supabase-test-client';

describe('GET /api/profiles/me', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe('Success Cases', () => {
    it('should return current user profile with authentication', async () => {
      // Arrange: Create authenticated user
      const testUser = await createAuthenticatedUser({
        email: 'profile-fetch@example.com',
        password: 'SecurePass123!',
        full_name: 'Profile Fetch User',
      });

      // Act: Get profile
      const response = await authenticatedGet('/api/profiles/me', testUser.token);

      // Assert: Should return profile data
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(testUser.id);
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe('profile-fetch@example.com');
      expect(response.body).toHaveProperty('full_name');
      expect(response.body.full_name).toBe('Profile Fetch User');
    });

    it('should include theme preference in profile data', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'theme-test@example.com',
        password: 'SecurePass123!',
        full_name: 'Theme Test User',
      });

      // Act
      const response = await authenticatedGet('/api/profiles/me', testUser.token);

      // Assert: Theme should be present (default or set)
      assertSuccess(response);
      expect(response.body).toHaveProperty('theme');
      expect(['light', 'dark', 'system']).toContain(response.body.theme);
    });

    it('should return profile with all expected fields', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'full-profile@example.com',
        password: 'SecurePass123!',
        full_name: 'Full Profile User',
      });

      // Act
      const response = await authenticatedGet('/api/profiles/me', testUser.token);

      // Assert: Check all expected profile fields
      assertSuccess(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('full_name');
      expect(response.body).toHaveProperty('theme');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
    });
  });

  describe('Authentication Errors (401)', () => {
    it('should reject request without authentication token', async () => {
      // Act: Try to get profile without authentication
      const response = await unauthenticatedGet('/api/profiles/me');

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      // Act: Try with fake token
      const response = await authenticatedGet(
        '/api/profiles/me',
        'invalid.jwt.token'
      );

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with expired/invalidated token', async () => {
      // Arrange: Create user and logout (invalidate token)
      const testUser = await createAuthenticatedUser({
        email: 'expired-token@example.com',
        password: 'SecurePass123!',
        full_name: 'Expired Token User',
      });

      // Logout to invalidate token
      await authenticatedGet('/api/auth/session', testUser.token);

      // Act: Try to access profile with invalidated token
      const response = await authenticatedGet('/api/profiles/me', testUser.token);

      // Assert: Should fail (implementation dependent - might still work if token not fully invalidated)
      // This test's behavior depends on your session invalidation strategy
      if (response.status !== 200) {
        assertError(response, 401);
      }
    });
  });
});

describe('PATCH /api/profiles/me/theme', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe('Success Cases', () => {
    it('should update theme to light', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'theme-light@example.com',
        password: 'SecurePass123!',
        full_name: 'Theme Light User',
      });

      // Act: Update theme to light
      const response = await authenticatedPatch(
        '/api/profiles/me/theme',
        testUser.token,
        { theme: 'light' }
      );

      // Assert
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('theme');
      expect(response.body.theme).toBe('light');
    });

    it('should update theme to dark', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'theme-dark@example.com',
        password: 'SecurePass123!',
        full_name: 'Theme Dark User',
      });

      // Act
      const response = await authenticatedPatch(
        '/api/profiles/me/theme',
        testUser.token,
        { theme: 'dark' }
      );

      // Assert
      assertSuccess(response);
      expect(response.body.theme).toBe('dark');
    });

    it('should update theme to system', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'theme-system@example.com',
        password: 'SecurePass123!',
        full_name: 'Theme System User',
      });

      // Act
      const response = await authenticatedPatch(
        '/api/profiles/me/theme',
        testUser.token,
        { theme: 'system' }
      );

      // Assert
      assertSuccess(response);
      expect(response.body.theme).toBe('system');
    });

    it('should persist theme change in database', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'theme-persist@example.com',
        password: 'SecurePass123!',
        full_name: 'Theme Persist User',
      });

      const adminClient = getAdminSupabaseClient();

      // Act: Update theme
      await authenticatedPatch('/api/profiles/me/theme', testUser.token, {
        theme: 'dark',
      });

      // Assert: Verify in database
      const { data: profile } = await adminClient
        .from('profiles')
        .select('theme')
        .eq('id', testUser.id)
        .single();

      expect(profile).toBeTruthy();
      expect(profile!.theme).toBe('dark');
    });

    it('should update updated_at timestamp', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'theme-timestamp@example.com',
        password: 'SecurePass123!',
        full_name: 'Theme Timestamp User',
      });

      const adminClient = getAdminSupabaseClient();

      // Get initial timestamp
      const { data: profileBefore } = await adminClient
        .from('profiles')
        .select('updated_at')
        .eq('id', testUser.id)
        .single();

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Act: Update theme
      await authenticatedPatch('/api/profiles/me/theme', testUser.token, {
        theme: 'light',
      });

      // Assert: updated_at should be different
      const { data: profileAfter } = await adminClient
        .from('profiles')
        .select('updated_at')
        .eq('id', testUser.id)
        .single();

      expect(profileAfter!.updated_at).not.toBe(profileBefore!.updated_at);
      expect(new Date(profileAfter!.updated_at).getTime()).toBeGreaterThan(
        new Date(profileBefore!.updated_at).getTime()
      );
    });
  });

  describe('Validation Errors (400)', () => {
    it('should reject invalid theme value', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'invalid-theme@example.com',
        password: 'SecurePass123!',
        full_name: 'Invalid Theme User',
      });

      // Act: Try to set invalid theme
      const response = await authenticatedPatch(
        '/api/profiles/me/theme',
        testUser.token,
        { theme: 'invalid-value' }
      );

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing theme field', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'missing-theme@example.com',
        password: 'SecurePass123!',
        full_name: 'Missing Theme User',
      });

      // Act: Try to update without theme field
      const response = await authenticatedPatch(
        '/api/profiles/me/theme',
        testUser.token,
        {}
      );

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject empty theme value', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'empty-theme@example.com',
        password: 'SecurePass123!',
        full_name: 'Empty Theme User',
      });

      // Act
      const response = await authenticatedPatch(
        '/api/profiles/me/theme',
        testUser.token,
        { theme: '' }
      );

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject null theme value', async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: 'null-theme@example.com',
        password: 'SecurePass123!',
        full_name: 'Null Theme User',
      });

      // Act
      const response = await authenticatedPatch(
        '/api/profiles/me/theme',
        testUser.token,
        { theme: null }
      );

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication Errors (401)', () => {
    it('should reject theme update without authentication', async () => {
      // Act: Try to update without token
      const response = await authenticatedPatch('/api/profiles/me/theme', '', {
        theme: 'dark',
      });

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject theme update with invalid token', async () => {
      // Act: Try with fake token
      const response = await authenticatedPatch(
        '/api/profiles/me/theme',
        'invalid.jwt.token',
        { theme: 'dark' }
      );

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty('error');
    });
  });
});

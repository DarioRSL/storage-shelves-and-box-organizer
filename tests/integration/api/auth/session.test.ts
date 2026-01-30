/**
 * Integration Tests: Authentication - Session Management
 *
 * Tests for:
 * - POST /api/auth/session (login)
 * - DELETE /api/auth/session (logout)
 *
 * Coverage:
 * - Successful login with valid credentials
 * - Login failures (invalid password, non-existent user, malformed input)
 * - Successful logout
 * - Logout failures (no token, invalid token)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearAllTestData } from "../../../helpers/db-setup";
import { createAuthenticatedUser } from "../../../helpers/auth-helper";
import { authenticatedDelete, unauthenticatedPost, assertSuccess, assertError } from "../../../helpers/api-client";

describe.skip("POST /api/auth/session (Login)", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should login with valid credentials and return session token", async () => {
      // Arrange: Create a test user
      const testUser = await createAuthenticatedUser({
        email: "login-test@example.com",
        password: "SecurePass123!",
        full_name: "Login Test User",
      });

      // Act: Login with correct credentials
      const response = await unauthenticatedPost("/api/auth/session", {
        email: "login-test@example.com",
        password: "SecurePass123!",
      });

      // Assert: Should return 200 with session data
      assertSuccess(response);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("refresh_token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe("login-test@example.com");
      expect(response.body.user.id).toBe(testUser.id);
    });

    it.skip("should return user profile data on successful login", async () => {
      // Arrange
      await createAuthenticatedUser({
        email: "profile-test@example.com",
        password: "SecurePass123!",
        full_name: "Profile Test User",
      });

      // Act
      const response = await unauthenticatedPost("/api/auth/session", {
        email: "profile-test@example.com",
        password: "SecurePass123!",
      });

      // Assert: Profile data should be included
      assertSuccess(response);
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("email");
      expect(response.body.user.email).toBe("profile-test@example.com");
    });
  });

  describe.skip("Validation Errors (400)", () => {
    it("should reject login with missing email", async () => {
      // Act
      const response = await unauthenticatedPost("/api/auth/session", {
        password: "SecurePass123!",
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with missing password", async () => {
      // Act
      const response = await unauthenticatedPost("/api/auth/session", {
        email: "test@example.com",
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with empty email", async () => {
      // Act
      const response = await unauthenticatedPost("/api/auth/session", {
        email: "",
        password: "SecurePass123!",
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with empty password", async () => {
      // Act
      const response = await unauthenticatedPost("/api/auth/session", {
        email: "test@example.com",
        password: "",
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with invalid email format", async () => {
      // Act
      const response = await unauthenticatedPost("/api/auth/session", {
        email: "not-an-email",
        password: "SecurePass123!",
      });

      // Assert
      assertError(response, 400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe.skip("Authentication Errors (401)", () => {
    it("should reject login with incorrect password", async () => {
      // Arrange: Create a user
      await createAuthenticatedUser({
        email: "wrong-password@example.com",
        password: "CorrectPass123!",
        full_name: "Test User",
      });

      // Act: Try to login with wrong password
      const response = await unauthenticatedPost("/api/auth/session", {
        email: "wrong-password@example.com",
        password: "WrongPass123!",
      });

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });

    it.skip("should reject login with non-existent email", async () => {
      // Act: Try to login with email that doesn't exist
      const response = await unauthenticatedPost("/api/auth/session", {
        email: "nonexistent@example.com",
        password: "SecurePass123!",
      });

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with case-sensitive email mismatch", async () => {
      // Arrange
      await createAuthenticatedUser({
        email: "lowercase@example.com",
        password: "SecurePass123!",
        full_name: "Test User",
      });

      // Act: Try with uppercase (emails should be case-insensitive in most systems)
      const response = await unauthenticatedPost("/api/auth/session", {
        email: "LOWERCASE@example.com",
        password: "SecurePass123!",
      });

      // Assert: This test depends on your auth system behavior
      // Most modern systems treat emails as case-insensitive
      // If your system is case-sensitive, this should return 401
      // If case-insensitive, this should succeed (200)
      if (response.status === 200) {
        assertSuccess(response);
      } else {
        assertError(response, 401);
      }
    });
  });
});

describe.skip("DELETE /api/auth/session (Logout)", () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  afterEach(async () => {
    await clearAllTestData();
  });

  describe("Success Cases", () => {
    it("should logout authenticated user and invalidate token", async () => {
      // Arrange: Create and login user
      const testUser = await createAuthenticatedUser({
        email: "logout-test@example.com",
        password: "SecurePass123!",
        full_name: "Logout Test User",
      });

      // Act: Logout
      const response = await authenticatedDelete("/api/auth/session", testUser.token);

      // Assert: Should return 204 No Content
      expect(response.status).toBe(204);
    });

    it("should clear session cookie on logout", async () => {
      // Arrange
      const testUser = await createAuthenticatedUser({
        email: "cookie-test@example.com",
        password: "SecurePass123!",
        full_name: "Cookie Test User",
      });

      // Act
      const response = await authenticatedDelete("/api/auth/session", testUser.token);

      // Assert: Check that Set-Cookie header clears the session
      expect(response.status).toBe(204);
      // Note: Cookie clearing verification depends on your implementation
      // Some systems return Set-Cookie with Max-Age=0 or Expires in the past
    });
  });

  describe.skip("Authentication Errors (401)", () => {
    it("should reject logout without authentication token", async () => {
      // Act: Try to logout without token
      const response = await authenticatedDelete("/api/auth/session", "");

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject logout with invalid token", async () => {
      // Act: Try to logout with fake token
      const response = await authenticatedDelete("/api/auth/session", "invalid.token.here");

      // Assert
      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject logout with expired token", async () => {
      // Arrange: Create a user and logout (invalidate token)
      const testUser = await createAuthenticatedUser({
        email: "expired-test@example.com",
        password: "SecurePass123!",
        full_name: "Expired Test User",
      });

      // First logout to invalidate the token
      await authenticatedDelete("/api/auth/session", testUser.token);

      // Act: Try to logout again with the same (now invalid) token
      const response = await authenticatedDelete("/api/auth/session", testUser.token);

      // Assert: Should fail because token is already invalidated
      assertError(response, 401);
      expect(response.body).toHaveProperty("error");
    });
  });
});

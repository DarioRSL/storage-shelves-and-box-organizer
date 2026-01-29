/**
 * Unit Tests for Logger Pure Functions
 *
 * Tests only the pure functions from logger.ts (maskJWT, sanitizeMetadata).
 * The Winston logger setup is not tested as it involves external dependencies.
 *
 * Business Rules:
 * - maskJWT: Masks JWT tokens showing only header + first 10 chars of payload
 * - maskJWT: Returns [REDACTED] for invalid formats or short tokens
 * - maskJWT: Requires token with 3 parts separated by dots (header.payload.signature)
 * - sanitizeMetadata: Redacts sensitive keys (password, token, apiKey, secret, etc.)
 * - sanitizeMetadata: Case-insensitive key matching for sensitive data
 * - sanitizeMetadata: Returns undefined for undefined input
 * - sanitizeMetadata: Preserves non-sensitive keys
 *
 * Coverage Target: 100% for pure functions
 * Test Count: 14 tests
 */

import { describe, it, expect } from "vitest";
import { maskJWT, sanitizeMetadata } from "@/lib/services/logger";
import type { LogMetadata } from "@/lib/services/logger";

describe("Logger Pure Functions", () => {
  describe("maskJWT", () => {
    it("TC-LOGGER-001: should mask valid JWT token correctly", () => {
      // Arrange
      const validToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

      // Act
      const result = maskJWT(validToken);

      // Assert
      expect(result).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOi...[REDACTED]");
      expect(result).toContain("...[REDACTED]");
      expect(result.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.")).toBe(true);
      expect(result.endsWith("[REDACTED]")).toBe(true);
    });

    it("TC-LOGGER-002: should handle null token by returning [REDACTED]", () => {
      // Arrange
      const nullToken = null as unknown as string;

      // Act
      const result = maskJWT(nullToken);

      // Assert
      expect(result).toBe("[REDACTED]");
    });

    it("TC-LOGGER-003: should handle undefined token by returning [REDACTED]", () => {
      // Arrange
      const undefinedToken = undefined as unknown as string;

      // Act
      const result = maskJWT(undefinedToken);

      // Assert
      expect(result).toBe("[REDACTED]");
    });

    it("TC-LOGGER-004: should handle empty string by returning [REDACTED]", () => {
      // Arrange
      const emptyToken = "";

      // Act
      const result = maskJWT(emptyToken);

      // Assert
      expect(result).toBe("[REDACTED]");
    });

    it("TC-LOGGER-005: should handle short token (less than 20 chars) by returning [REDACTED]", () => {
      // Arrange
      const shortToken = "short.token.here";

      // Act
      const result = maskJWT(shortToken);

      // Assert
      expect(result).toBe("[REDACTED]");
    });

    it("TC-LOGGER-006: should handle token with only 1 part by returning [REDACTED]", () => {
      // Arrange
      const onePartToken = "this-is-just-one-long-part-without-dots-totaling-more-than-twenty-chars";

      // Act
      const result = maskJWT(onePartToken);

      // Assert
      expect(result).toBe("[REDACTED]");
    });

    it("TC-LOGGER-007: should handle token with only 2 parts by returning [REDACTED]", () => {
      // Arrange
      const twoPartToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ";

      // Act
      const result = maskJWT(twoPartToken);

      // Assert
      expect(result).toBe("[REDACTED]");
    });

    it("TC-LOGGER-008: should handle token with 4 parts by returning [REDACTED]", () => {
      // Arrange
      const fourPartToken = "part1.part2.part3.part4-with-more-chars-to-exceed-twenty";

      // Act
      const result = maskJWT(fourPartToken);

      // Assert
      expect(result).toBe("[REDACTED]");
    });

    it("TC-LOGGER-009: should show exactly first 10 chars of payload", () => {
      // Arrange
      const token = "header123456.payload1234567890extra.signature123456";

      // Act
      const result = maskJWT(token);

      // Assert
      expect(result).toBe("header123456.payload123...[REDACTED]");
      // Verify the result contains the header and first 10 chars of payload
      expect(result.startsWith("header123456.payload123")).toBe(true);
    });

    it("TC-LOGGER-010: should handle token where payload is shorter than 10 chars", () => {
      // Arrange
      const token = "header-part-long-enough.short.signature-long-enough-here";

      // Act
      const result = maskJWT(token);

      // Assert
      expect(result).toBe("header-part-long-enough.short...[REDACTED]");
    });
  });

  describe("sanitizeMetadata", () => {
    it("TC-LOGGER-011: should return undefined for undefined metadata", () => {
      // Arrange
      const meta = undefined;

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toBeUndefined();
    });

    it("TC-LOGGER-012: should return empty object for empty metadata", () => {
      // Arrange
      const meta: LogMetadata = {};

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({});
    });

    it("TC-LOGGER-013: should redact password field", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        password: "secret123",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        password: "[REDACTED]",
      });
    });

    it("TC-LOGGER-014: should redact token field", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        token: "bearer-token-xyz",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        token: "[REDACTED]",
      });
    });

    it("TC-LOGGER-015: should redact apiKey field (camelCase)", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        apiKey: "api-key-xyz",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        apiKey: "[REDACTED]",
      });
    });

    it("TC-LOGGER-016: should redact api_key field (snake_case)", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        api_key: "api-key-xyz",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        api_key: "[REDACTED]",
      });
    });

    it("TC-LOGGER-017: should redact secret field", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        secret: "my-secret-value",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        secret: "[REDACTED]",
      });
    });

    it("TC-LOGGER-018: should redact jwt field", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        jwt: "[REDACTED]",
      });
    });

    it("TC-LOGGER-019: should redact access_token field", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        access_token: "access-token-value",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        access_token: "[REDACTED]",
      });
    });

    it("TC-LOGGER-020: should redact refresh_token field", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        refresh_token: "refresh-token-value",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        refresh_token: "[REDACTED]",
      });
    });

    it("TC-LOGGER-021: should handle case-insensitive key matching", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        PASSWORD: "secret123",
        Token: "bearer-token",
        ApiKey: "api-key-xyz",
        SECRET: "my-secret",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        PASSWORD: "[REDACTED]",
        Token: "[REDACTED]",
        ApiKey: "[REDACTED]",
        SECRET: "[REDACTED]",
      });
    });

    it("TC-LOGGER-022: should preserve non-sensitive keys", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        workspaceId: "workspace-456",
        boxId: "box-789",
        locationId: "location-012",
        qrCodeId: "qr-345",
        requestId: "request-678",
        customField: "custom-value",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        workspaceId: "workspace-456",
        boxId: "box-789",
        locationId: "location-012",
        qrCodeId: "qr-345",
        requestId: "request-678",
        customField: "custom-value",
      });
    });

    it("TC-LOGGER-023: should handle mixed sensitive and non-sensitive keys", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        password: "secret123",
        workspaceId: "workspace-456",
        token: "bearer-token",
        boxId: "box-789",
        apiKey: "api-key-xyz",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        password: "[REDACTED]",
        workspaceId: "workspace-456",
        token: "[REDACTED]",
        boxId: "box-789",
        apiKey: "[REDACTED]",
      });
    });

    it("TC-LOGGER-024: should redact keys containing sensitive words as substring", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        userPassword: "secret123",
        bearerToken: "bearer-token",
        clientApiKey: "api-key-xyz",
        dbSecret: "db-secret",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        userPassword: "[REDACTED]",
        bearerToken: "[REDACTED]",
        clientApiKey: "[REDACTED]",
        dbSecret: "[REDACTED]",
      });
    });

    it("TC-LOGGER-025: should not mutate original metadata object", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        password: "secret123",
      };
      const originalMeta = { ...meta };

      // Act
      sanitizeMetadata(meta);

      // Assert
      expect(meta).toEqual(originalMeta);
      expect(meta.password).toBe("secret123"); // Original unchanged
    });

    it("TC-LOGGER-026: should handle metadata with various data types", () => {
      // Arrange
      const meta: LogMetadata = {
        userId: "user-123",
        count: 42,
        isActive: true,
        tags: ["tag1", "tag2"],
        nested: { key: "value" },
        password: "secret123",
      };

      // Act
      const result = sanitizeMetadata(meta);

      // Assert
      expect(result).toEqual({
        userId: "user-123",
        count: 42,
        isActive: true,
        tags: ["tag1", "tag2"],
        nested: { key: "value" },
        password: "[REDACTED]",
      });
    });
  });
});

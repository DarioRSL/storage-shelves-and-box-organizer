/**
 * Unit Tests for Client-Side Logger
 *
 * Tests the browser console wrapper functions for client-side logging.
 *
 * Business Rules:
 * - error() routes to console.error
 * - warn() routes to console.warn
 * - info() routes to console.log (NOT console.info)
 * - debug() routes to console.debug
 * - Metadata is optional and can be omitted
 * - Empty metadata objects should not be passed to console
 * - Metadata structure should be preserved when passed to console
 * - All functions handle string messages
 *
 * Coverage Target: 100%
 * Test Count: 8 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { log, type LogMetadata } from "@/lib/services/logger.client";

describe("Client Logger", () => {
  // Spy objects for console methods
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create spies for all console methods
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);
  });

  afterEach(() => {
    // Restore all mocks
    vi.restoreAllMocks();
  });

  describe("log.error()", () => {
    it("TC-LOGGER-CLIENT-001: should call console.error with message only", () => {
      // Arrange
      const message = "Test error message";

      // Act
      log.error(message);

      // Assert
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(message);
    });

    it("TC-LOGGER-CLIENT-002: should call console.error with message and metadata", () => {
      // Arrange
      const message = "Error with metadata";
      const metadata: LogMetadata = {
        userId: "user-123",
        workspaceId: "workspace-456",
      };

      // Act
      log.error(message, metadata);

      // Assert
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(message, metadata);
    });

    it("should not pass empty metadata object to console.error", () => {
      // Arrange
      const message = "Error without metadata";
      const emptyMetadata: LogMetadata = {};

      // Act
      log.error(message, emptyMetadata);

      // Assert
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(message);
    });

    it("should handle undefined metadata", () => {
      // Arrange
      const message = "Error with undefined metadata";

      // Act
      log.error(message, undefined);

      // Assert
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(message);
    });
  });

  describe("log.warn()", () => {
    it("TC-LOGGER-CLIENT-003: should call console.warn with message and metadata", () => {
      // Arrange
      const message = "Warning message";
      const metadata: LogMetadata = {
        requestId: "req-789",
        boxId: "box-abc",
      };

      // Act
      log.warn(message, metadata);

      // Assert
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(message, metadata);
    });

    it("should call console.warn with message only when no metadata", () => {
      // Arrange
      const message = "Warning without metadata";

      // Act
      log.warn(message);

      // Assert
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(message);
    });

    it("should not pass empty metadata object to console.warn", () => {
      // Arrange
      const message = "Warning without metadata";
      const emptyMetadata: LogMetadata = {};

      // Act
      log.warn(message, emptyMetadata);

      // Assert
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(message);
    });
  });

  describe("log.info()", () => {
    it("TC-LOGGER-CLIENT-004: should call console.log with message and metadata", () => {
      // Arrange
      const message = "Info message";
      const metadata: LogMetadata = {
        locationId: "loc-xyz",
        userId: "user-999",
      };

      // Act
      log.info(message, metadata);

      // Assert
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(message, metadata);
      // Verify it's using console.log, not console.info
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it("should call console.log with message only when no metadata", () => {
      // Arrange
      const message = "Info without metadata";

      // Act
      log.info(message);

      // Assert
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(message);
    });

    it("should not pass empty metadata object to console.log", () => {
      // Arrange
      const message = "Info without metadata";
      const emptyMetadata: LogMetadata = {};

      // Act
      log.info(message, emptyMetadata);

      // Assert
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(message);
    });
  });

  describe("log.debug()", () => {
    it("TC-LOGGER-CLIENT-005: should call console.debug with message and metadata", () => {
      // Arrange
      const message = "Debug message";
      const metadata: LogMetadata = {
        qrCodeId: "qr-123",
        workspaceId: "workspace-456",
      };

      // Act
      log.debug(message, metadata);

      // Assert
      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(debugSpy).toHaveBeenCalledWith(message, metadata);
    });

    it("should call console.debug with message only when no metadata", () => {
      // Arrange
      const message = "Debug without metadata";

      // Act
      log.debug(message);

      // Assert
      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(debugSpy).toHaveBeenCalledWith(message);
    });

    it("should not pass empty metadata object to console.debug", () => {
      // Arrange
      const message = "Debug without metadata";
      const emptyMetadata: LogMetadata = {};

      // Act
      log.debug(message, emptyMetadata);

      // Assert
      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(debugSpy).toHaveBeenCalledWith(message);
    });
  });

  describe("Metadata Handling", () => {
    it("TC-LOGGER-CLIENT-006: should handle undefined metadata (only message passed)", () => {
      // Arrange
      const message = "Test message";

      // Act & Assert
      log.error(message);
      expect(errorSpy).toHaveBeenCalledWith(message);

      log.warn(message);
      expect(warnSpy).toHaveBeenCalledWith(message);

      log.info(message);
      expect(logSpy).toHaveBeenCalledWith(message);

      log.debug(message);
      expect(debugSpy).toHaveBeenCalledWith(message);
    });

    it("TC-LOGGER-CLIENT-007: should handle complex metadata objects", () => {
      // Arrange
      const message = "Complex metadata test";
      const metadata: LogMetadata = {
        userId: "user-123",
        workspaceId: "workspace-456",
        boxId: "box-789",
        locationId: "loc-abc",
        qrCodeId: "qr-def",
        requestId: "req-ghi",
        customField: "custom-value",
        nestedObject: { key: "value", count: 42 },
        arrayField: [1, 2, 3],
      };

      // Act
      log.error(message, metadata);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(message, metadata);
      expect(errorSpy).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          userId: "user-123",
          workspaceId: "workspace-456",
          boxId: "box-789",
          locationId: "loc-abc",
          qrCodeId: "qr-def",
          requestId: "req-ghi",
          customField: "custom-value",
          nestedObject: { key: "value", count: 42 },
          arrayField: [1, 2, 3],
        })
      );
    });

    it("TC-LOGGER-CLIENT-008: should preserve metadata structure", () => {
      // Arrange
      const message = "Metadata structure test";
      const metadata: LogMetadata = {
        userId: "user-test",
        workspaceId: "workspace-test",
        customData: {
          nested: {
            deep: {
              value: "preserved",
            },
          },
        },
      };

      // Act
      log.info(message, metadata);

      // Assert - Get the actual metadata passed to console.log
      expect(logSpy).toHaveBeenCalledTimes(1);
      const [actualMessage, actualMetadata] = logSpy.mock.calls[0];

      expect(actualMessage).toBe(message);
      expect(actualMetadata).toEqual(metadata);
      expect(actualMetadata).toStrictEqual({
        userId: "user-test",
        workspaceId: "workspace-test",
        customData: {
          nested: {
            deep: {
              value: "preserved",
            },
          },
        },
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string message", () => {
      // Act
      log.error("");

      // Assert
      expect(errorSpy).toHaveBeenCalledWith("");
    });

    it("should handle message with special characters", () => {
      // Arrange
      const message = 'Error: \n\t Special "characters" & symbols! @#$%^&*()';

      // Act
      log.warn(message);

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(message);
    });

    it("should handle metadata with all standard fields", () => {
      // Arrange
      const message = "All fields test";
      const metadata: LogMetadata = {
        userId: "user-1",
        workspaceId: "workspace-1",
        boxId: "box-1",
        locationId: "loc-1",
        qrCodeId: "qr-1",
        requestId: "req-1",
      };

      // Act
      log.debug(message, metadata);

      // Assert
      expect(debugSpy).toHaveBeenCalledWith(message, metadata);
    });

    it("should handle metadata with only custom fields", () => {
      // Arrange
      const message = "Custom fields only";
      const metadata: LogMetadata = {
        customField1: "value1",
        customField2: 42,
        customField3: true,
      };

      // Act
      log.info(message, metadata);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(message, metadata);
    });
  });
});

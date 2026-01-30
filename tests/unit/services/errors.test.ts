/**
 * Unit Tests for Error Classes
 *
 * Tests custom application error classes used for consistent error handling.
 *
 * Business Rules:
 * - All errors extend AppError base class
 * - Each error has appropriate HTTP status code
 * - Error messages are in Polish
 * - Errors have default messages that can be overridden
 * - Error.name matches constructor name
 *
 * Coverage Target: 100%
 * Test Count: 8-10 tests
 */

import { describe, it, expect } from "vitest";
import {
  AppError,
  InsufficientPermissionsError,
  OwnerRemovalError,
  WorkspaceOwnershipError,
  UserAccountNotFoundError,
  AccountDeletionError,
  AuthRevocationError,
  WorkspaceNotFoundError,
  DuplicateMemberError,
  InvalidOperationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  WorkspaceMembershipError,
  ParentNotFoundError,
  MaxDepthExceededError,
  SiblingConflictError,
  BoxNotFoundError,
  LocationNotFoundError,
  WorkspaceMismatchError,
  QrCodeNotFoundError,
  QrCodeAlreadyAssignedError,
} from "@/lib/services/errors";

describe("Error Classes", () => {
  describe("AppError Base Class", () => {
    // Create concrete implementation for testing abstract base class
    class TestError extends AppError {
      constructor(message: string, statusCode?: number) {
        super(message, statusCode);
      }
    }

    it("TC-ERR-001: should create error with message and default status code", () => {
      const error = new TestError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe("TestError");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it("should create error with custom status code", () => {
      const error = new TestError("Custom error", 418);

      expect(error.message).toBe("Custom error");
      expect(error.statusCode).toBe(418);
    });

    it("should set prototype correctly for instanceof checks", () => {
      const error = new TestError("Test error");

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("Authentication & Authorization Errors", () => {
    it("TC-ERR-002: should create InsufficientPermissionsError with default message", () => {
      const error = new InsufficientPermissionsError();

      expect(error.message).toBe("Brak uprawnień");
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe("InsufficientPermissionsError");
    });

    it("should create InsufficientPermissionsError with custom message", () => {
      const error = new InsufficientPermissionsError("Custom permission error");

      expect(error.message).toBe("Custom permission error");
      expect(error.statusCode).toBe(403);
    });

    it("should create OwnerRemovalError with correct properties", () => {
      const error = new OwnerRemovalError();

      expect(error.message).toBe("Nie można usunąć właściciela workspace'u");
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe("OwnerRemovalError");
    });

    it("should create WorkspaceOwnershipError with correct properties", () => {
      const error = new WorkspaceOwnershipError();

      expect(error.message).toBe("Tylko właściciel workspace'u może go aktualizować");
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe("WorkspaceOwnershipError");
    });
  });

  describe("Account & Profile Errors", () => {
    it("should create UserAccountNotFoundError with correct properties", () => {
      const error = new UserAccountNotFoundError();

      expect(error.message).toBe("Konto użytkownika nie zostało znalezione");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("UserAccountNotFoundError");
    });

    it("should create AccountDeletionError with correct properties", () => {
      const error = new AccountDeletionError();

      expect(error.message).toBe("Nie udało się usunąć konta");
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe("AccountDeletionError");
    });

    it("should create AuthRevocationError with correct properties", () => {
      const error = new AuthRevocationError();

      expect(error.message).toBe("Nie udało się odwołać uwierzytelnienia");
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe("AuthRevocationError");
    });
  });

  describe("Workspace Errors", () => {
    it("should create WorkspaceNotFoundError with correct properties", () => {
      const error = new WorkspaceNotFoundError();

      expect(error.message).toBe("Workspace nie został znaleziony");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("WorkspaceNotFoundError");
    });

    it("should create DuplicateMemberError with correct properties", () => {
      const error = new DuplicateMemberError();

      expect(error.message).toBe("Użytkownik jest już członkiem tego workspace'u");
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe("DuplicateMemberError");
    });

    it("should create InvalidOperationError with correct properties", () => {
      const error = new InvalidOperationError();

      expect(error.message).toBe("Nieprawidłowa operacja");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("InvalidOperationError");
    });
  });

  describe("Location Errors", () => {
    it("should create NotFoundError with correct properties", () => {
      const error = new NotFoundError();

      expect(error.message).toBe("Zasób nie został znaleziony");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("NotFoundError");
    });

    it("should create ConflictError with correct properties", () => {
      const error = new ConflictError();

      expect(error.message).toBe("Konflikt zasobu");
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe("ConflictError");
    });

    it("should create ForbiddenError with correct properties", () => {
      const error = new ForbiddenError();

      expect(error.message).toBe("Brak dostępu");
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe("ForbiddenError");
    });

    it("should create WorkspaceMembershipError with correct properties", () => {
      const error = new WorkspaceMembershipError();

      expect(error.message).toBe("Nie jesteś członkiem tego workspace'u");
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe("WorkspaceMembershipError");
    });

    it("should create ParentNotFoundError with correct properties", () => {
      const error = new ParentNotFoundError();

      expect(error.message).toBe("Lokalizacja nadrzędna nie została znaleziona");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("ParentNotFoundError");
    });

    it("TC-ERR-003: should create MaxDepthExceededError with correct properties", () => {
      const error = new MaxDepthExceededError();

      expect(error.message).toBe("Maksymalna głębokość hierarchii lokalizacji (5 poziomów) przekroczona");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("MaxDepthExceededError");
    });

    it("should create SiblingConflictError with correct properties", () => {
      const error = new SiblingConflictError();

      expect(error.message).toBe("Lokalizacja o tej nazwie już istnieje na tym poziomie");
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe("SiblingConflictError");
    });
  });

  describe("Box Errors", () => {
    it("should create BoxNotFoundError with correct properties", () => {
      const error = new BoxNotFoundError();

      expect(error.message).toBe("Pudełko nie zostało znalezione");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("BoxNotFoundError");
    });

    it("should create LocationNotFoundError with correct properties", () => {
      const error = new LocationNotFoundError();

      expect(error.message).toBe("Lokalizacja nie została znaleziona");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("LocationNotFoundError");
    });

    it("should create WorkspaceMismatchError with correct properties", () => {
      const error = new WorkspaceMismatchError();

      expect(error.message).toBe("Pudełko nie należy do tego workspace'u");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("WorkspaceMismatchError");
    });
  });

  describe("QR Code Errors", () => {
    it("should create QrCodeNotFoundError with correct properties", () => {
      const error = new QrCodeNotFoundError();

      expect(error.message).toBe("Kod QR nie został znaleziony");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("QrCodeNotFoundError");
    });

    it("should create QrCodeAlreadyAssignedError with correct properties", () => {
      const error = new QrCodeAlreadyAssignedError();

      expect(error.message).toBe("Kod QR jest już przypisany do pudełka");
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe("QrCodeAlreadyAssignedError");
    });
  });

  describe("Custom Messages", () => {
    it("should allow overriding default messages for all error types", () => {
      const errors = [
        { ErrorClass: InsufficientPermissionsError, customMessage: "No access allowed" },
        { ErrorClass: WorkspaceNotFoundError, customMessage: "Cannot find workspace" },
        { ErrorClass: BoxNotFoundError, customMessage: "Box ID invalid" },
      ];

      errors.forEach(({ ErrorClass, customMessage }) => {
        const error = new ErrorClass(customMessage);
        expect(error.message).toBe(customMessage);
      });
    });
  });

  describe("Status Code Grouping", () => {
    it("TC-ERR-004: should group 403 Forbidden errors correctly", () => {
      const forbiddenErrors = [
        new InsufficientPermissionsError(),
        new OwnerRemovalError(),
        new WorkspaceOwnershipError(),
        new ForbiddenError(),
        new WorkspaceMembershipError(),
      ];

      forbiddenErrors.forEach((error) => {
        expect(error.statusCode).toBe(403);
      });
    });

    it("should group 404 Not Found errors correctly", () => {
      const notFoundErrors = [
        new UserAccountNotFoundError(),
        new WorkspaceNotFoundError(),
        new NotFoundError(),
        new ParentNotFoundError(),
        new BoxNotFoundError(),
        new LocationNotFoundError(),
        new QrCodeNotFoundError(),
      ];

      notFoundErrors.forEach((error) => {
        expect(error.statusCode).toBe(404);
      });
    });

    it("should group 409 Conflict errors correctly", () => {
      const conflictErrors = [
        new DuplicateMemberError(),
        new ConflictError(),
        new SiblingConflictError(),
        new QrCodeAlreadyAssignedError(),
      ];

      conflictErrors.forEach((error) => {
        expect(error.statusCode).toBe(409);
      });
    });

    it("should group 400 Bad Request errors correctly", () => {
      const badRequestErrors = [new InvalidOperationError(), new MaxDepthExceededError(), new WorkspaceMismatchError()];

      badRequestErrors.forEach((error) => {
        expect(error.statusCode).toBe(400);
      });
    });

    it("should group 500 Internal Server errors correctly", () => {
      const serverErrors = [new AccountDeletionError(), new AuthRevocationError()];

      serverErrors.forEach((error) => {
        expect(error.statusCode).toBe(500);
      });
    });
  });

  describe("Inheritance Chain", () => {
    it("should maintain proper inheritance chain for all errors", () => {
      const errors = [
        new InsufficientPermissionsError(),
        new WorkspaceNotFoundError(),
        new BoxNotFoundError(),
        new QrCodeAlreadyAssignedError(),
        new MaxDepthExceededError(),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(Error);
      });
    });
  });
});

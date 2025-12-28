/**
 * Centralized error classes for all services.
 * These are custom error types used for consistent error handling across the application.
 */

/**
 * Base error class for application-specific errors.
 * Extends Error to provide custom error handling and identification.
 */
export abstract class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ═══════════════════════════════════════════════════════════════════
// AUTHENTICATION & AUTHORIZATION ERRORS
// ═══════════════════════════════════════════════════════════════════

/**
 * Thrown when user lacks required permissions for an operation.
 * HTTP Status: 403 Forbidden
 */
export class InsufficientPermissionsError extends AppError {
  constructor(message = "Brak uprawnień") {
    super(message, 403);
  }
}

/**
 * Thrown when attempting to remove workspace owner.
 * HTTP Status: 403 Forbidden
 */
export class OwnerRemovalError extends AppError {
  constructor(message = "Nie można usunąć właściciela workspace'u") {
    super(message, 403);
  }
}

/**
 * Thrown when user is not workspace owner for operations requiring ownership.
 * HTTP Status: 403 Forbidden
 */
export class WorkspaceOwnershipError extends AppError {
  constructor(message = "Tylko właściciel workspace'u może go aktualizować") {
    super(message, 403);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ACCOUNT & PROFILE ERRORS
// ═══════════════════════════════════════════════════════════════════

/**
 * Thrown when user account/profile is not found.
 * HTTP Status: 404 Not Found
 */
export class UserAccountNotFoundError extends AppError {
  constructor(message = "Konto użytkownika nie zostało znalezione") {
    super(message, 404);
  }
}

/**
 * Thrown when account deletion operation fails.
 * HTTP Status: 500 Internal Server Error
 */
export class AccountDeletionError extends AppError {
  constructor(message = "Nie udało się usunąć konta") {
    super(message, 500);
  }
}

/**
 * Thrown when Supabase Auth user revocation/deletion fails.
 * HTTP Status: 500 Internal Server Error
 */
export class AuthRevocationError extends AppError {
  constructor(message = "Nie udało się odwołać uwierzytelnienia") {
    super(message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════════
// WORKSPACE ERRORS
// ═══════════════════════════════════════════════════════════════════

/**
 * Thrown when workspace is not found.
 * HTTP Status: 404 Not Found
 */
export class WorkspaceNotFoundError extends AppError {
  constructor(message = "Workspace nie został znaleziony") {
    super(message, 404);
  }
}

/**
 * Thrown when attempting to create duplicate workspace membership.
 * HTTP Status: 409 Conflict
 */
export class DuplicateMemberError extends AppError {
  constructor(message = "Użytkownik jest już członkiem tego workspace'u") {
    super(message, 409);
  }
}

/**
 * Thrown when an invalid workspace operation is attempted.
 * HTTP Status: 400 Bad Request
 */
export class InvalidOperationError extends AppError {
  constructor(message = "Nieprawidłowa operacja") {
    super(message, 400);
  }
}

// ═══════════════════════════════════════════════════════════════════
// LOCATION ERRORS
// ═══════════════════════════════════════════════════════════════════

/**
 * Thrown when location is not found.
 * HTTP Status: 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message = "Zasób nie został znaleziony") {
    super(message, 404);
  }
}

/**
 * Thrown when location conflict occurs (e.g., name duplicate).
 * HTTP Status: 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message = "Konflikt zasobu") {
    super(message, 409);
  }
}

/**
 * Thrown when user lacks access to workspace/location.
 * HTTP Status: 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message = "Brak dostępu") {
    super(message, 403);
  }
}

/**
 * Thrown when user is not a member of required workspace.
 * HTTP Status: 403 Forbidden
 */
export class WorkspaceMembershipError extends AppError {
  constructor(message = "Nie jesteś członkiem tego workspace'u") {
    super(message, 403);
  }
}

/**
 * Thrown when parent location is not found in hierarchy.
 * HTTP Status: 404 Not Found
 */
export class ParentNotFoundError extends AppError {
  constructor(message = "Lokalizacja nadrzędna nie została znaleziona") {
    super(message, 404);
  }
}

/**
 * Thrown when maximum location hierarchy depth is exceeded.
 * HTTP Status: 400 Bad Request
 */
export class MaxDepthExceededError extends AppError {
  constructor(message = "Maksymalna głębokość hierarchii lokalizacji (5 poziomów) przekroczona") {
    super(message, 400);
  }
}

/**
 * Thrown when creating sibling location with duplicate name.
 * HTTP Status: 409 Conflict
 */
export class SiblingConflictError extends AppError {
  constructor(message = "Lokalizacja o tej nazwie już istnieje na tym poziomie") {
    super(message, 409);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BOX ERRORS
// ═══════════════════════════════════════════════════════════════════

/**
 * Thrown when box is not found.
 * HTTP Status: 404 Not Found
 */
export class BoxNotFoundError extends AppError {
  constructor(message = "Pudełko nie zostało znalezione") {
    super(message, 404);
  }
}

/**
 * Thrown when box references non-existent location.
 * HTTP Status: 400 Bad Request
 */
export class LocationNotFoundError extends AppError {
  constructor(message = "Lokalizacja nie została znaleziona") {
    super(message, 404);
  }
}

/**
 * Thrown when box and workspace don't match for an operation.
 * HTTP Status: 400 Bad Request
 */
export class WorkspaceMismatchError extends AppError {
  constructor(message = "Pudełko nie należy do tego workspace'u") {
    super(message, 400);
  }
}

// ═══════════════════════════════════════════════════════════════════
// QR CODE ERRORS
// ═══════════════════════════════════════════════════════════════════

/**
 * Thrown when QR code is not found.
 * HTTP Status: 404 Not Found
 */
export class QrCodeNotFoundError extends AppError {
  constructor(message = "Kod QR nie został znaleziony") {
    super(message, 404);
  }
}

/**
 * Thrown when attempting to assign already-assigned QR code.
 * HTTP Status: 409 Conflict
 */
export class QrCodeAlreadyAssignedError extends AppError {
  constructor(message = "Kod QR jest już przypisany do pudełka") {
    super(message, 409);
  }
}

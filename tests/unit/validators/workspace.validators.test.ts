/**
 * Unit Tests for Workspace Validators
 *
 * Tests Zod validation schemas for workspace-related API endpoints.
 *
 * Business Rules:
 * - workspace_id must be valid UUID v4
 * - name is optional for PATCH, must be trimmed, 1-255 characters if provided
 * - description is optional and nullable
 * - At least one field must be provided for PATCH requests
 *
 * Coverage Target: 100%
 * Test Count: 20-26 tests
 */

import { describe, it, expect } from "vitest";
import {
  PatchWorkspaceParamsSchema,
  PatchWorkspaceSchema,
  DeleteWorkspaceParamsSchema,
  type PatchWorkspaceInput,
} from "@/lib/validators/workspace.validators";

describe("Workspace Validators", () => {
  describe("PatchWorkspaceParamsSchema", () => {
    const validWorkspaceId = "550e8400-e29b-41d4-a716-446655440000";

    describe("Valid inputs", () => {
      it("TC-WS-VAL-001: should validate valid workspace_id", () => {
        const input = {
          workspace_id: validWorkspaceId,
        };

        const result = PatchWorkspaceParamsSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.workspace_id).toBe(validWorkspaceId);
        }
      });

      it("should validate different valid UUID formats", () => {
        const validIds = [
          "123e4567-e89b-12d3-a456-426614174000",
          "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        ];

        validIds.forEach((id) => {
          const result = PatchWorkspaceParamsSchema.safeParse({ workspace_id: id });
          expect(result.success).toBe(true);
        });
      });
    });

    describe("Invalid inputs", () => {
      it("TC-WS-VAL-002: should reject missing workspace_id", () => {
        const input = {};

        const result = PatchWorkspaceParamsSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain("workspace_id");
        }
      });

      it("should reject invalid UUID format", () => {
        const input = {
          workspace_id: "not-a-uuid",
        };

        const result = PatchWorkspaceParamsSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Nieprawidłowy format ID workspace'u");
        }
      });

      it("should reject empty string workspace_id", () => {
        const input = {
          workspace_id: "",
        };

        const result = PatchWorkspaceParamsSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject workspace_id with invalid characters", () => {
        const input = {
          workspace_id: "550e8400-e29b-41d4-a716-44665544000g",
        };

        const result = PatchWorkspaceParamsSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("PatchWorkspaceSchema", () => {
    describe("Valid inputs", () => {
      it("TC-WS-VAL-003: should validate name only", () => {
        const input = {
          name: "Updated Workspace",
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Updated Workspace");
        }
      });

      it("should validate description only", () => {
        const input = {
          description: "New description",
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBe("New description");
        }
      });

      it("should validate both name and description", () => {
        const input: PatchWorkspaceInput = {
          name: "Team Workspace",
          description: "Main team workspace",
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Team Workspace");
          expect(result.data.description).toBe("Main team workspace");
        }
      });

      it("should trim whitespace from name", () => {
        const input = {
          name: "  My Workspace  ",
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("My Workspace");
        }
      });

      it("should accept null description", () => {
        const input = {
          description: null,
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBeNull();
        }
      });

      it("should accept name at minimum length (1 character after trim)", () => {
        const input = {
          name: "A",
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it("should accept name at maximum length (255 characters)", () => {
        const input = {
          name: "W".repeat(255),
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe("Invalid inputs - empty body", () => {
      it("TC-WS-VAL-004: should reject empty object (no fields provided)", () => {
        const input = {};

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Proszę podać co najmniej jedno pole do aktualizacji");
        }
      });
    });

    describe("Invalid inputs - name", () => {
      it("should reject empty name after trimming", () => {
        const input = {
          name: "   ",
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Nazwa workspace'a nie może być pusta");
        }
      });

      it("should reject name exceeding maximum length (256 characters)", () => {
        const input = {
          name: "W".repeat(256),
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Nazwa workspace'a nie może przekraczać 255 znaków");
        }
      });

      it("should reject empty string name", () => {
        const input = {
          name: "",
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe("Edge cases", () => {
      it("should handle name with special characters", () => {
        const input = {
          name: "Team-123 Workspace (2026)",
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Team-123 Workspace (2026)");
        }
      });

      it("should handle name with Unicode characters", () => {
        const input = {
          name: "Przestrzeń robocza 🚀",
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it("should handle description with newlines", () => {
        const input = {
          description: "Line 1\nLine 2\nLine 3",
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it("should preserve leading/trailing spaces in description", () => {
        const input = {
          description: "  Description with spaces  ",
        };

        const result = PatchWorkspaceSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBe("  Description with spaces  ");
        }
      });
    });
  });

  describe("DeleteWorkspaceParamsSchema", () => {
    const validWorkspaceId = "550e8400-e29b-41d4-a716-446655440000";

    describe("Valid inputs", () => {
      it("TC-WS-VAL-005: should validate valid workspace_id", () => {
        const input = {
          workspace_id: validWorkspaceId,
        };

        const result = DeleteWorkspaceParamsSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.workspace_id).toBe(validWorkspaceId);
        }
      });

      it("should validate different valid UUID formats", () => {
        const validIds = [
          "123e4567-e89b-12d3-a456-426614174000",
          "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        ];

        validIds.forEach((id) => {
          const result = DeleteWorkspaceParamsSchema.safeParse({ workspace_id: id });
          expect(result.success).toBe(true);
        });
      });
    });

    describe("Invalid inputs", () => {
      it("should reject missing workspace_id", () => {
        const input = {};

        const result = DeleteWorkspaceParamsSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain("workspace_id");
        }
      });

      it("should reject invalid UUID format", () => {
        const input = {
          workspace_id: "not-a-uuid",
        };

        const result = DeleteWorkspaceParamsSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Nieprawidłowy format identyfikatora przestrzeni roboczej");
        }
      });

      it("should reject empty string workspace_id", () => {
        const input = {
          workspace_id: "",
        };

        const result = DeleteWorkspaceParamsSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject workspace_id with wrong structure", () => {
        const input = {
          workspace_id: "12345678-1234-1234-123456789abc", // Missing section
        };

        const result = DeleteWorkspaceParamsSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });
});

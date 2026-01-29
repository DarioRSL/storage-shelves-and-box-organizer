/**
 * Unit Tests for useBoxForm Hook
 *
 * Tests the box form management behavior of the useBoxForm custom React hook.
 *
 * Business Rules:
 * - Supports both create and edit modes
 * - Loads workspace ID from nano store if not provided
 * - Validates form data using Zod schemas (createBoxSchema/updateBoxSchema)
 * - Tracks dirty state by comparing current values to initial state
 * - Loads locations and available QR codes on mount
 * - In edit mode, loads existing box data
 * - Generates QR code batches and reloads available codes
 * - Handles form submission (create/update) with validation
 * - Handles box deletion with error handling
 * - Clears field errors when user modifies fields
 * - Redirects to /auth on 401 errors
 * - Provides suggested tags from available locations
 * - Only submits changed fields in edit mode
 *
 * Coverage Target: 80-90%
 * Test Count: ~18-22 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBoxForm } from "@/components/hooks/useBoxForm";
import { apiFetch, ApiError } from "@/lib/api-client";
import { createBoxSchema, updateBoxSchema } from "@/lib/validation/box";
import { extractZodErrors } from "@/lib/validation/schemas";
import type { BoxDto, LocationDto, QrCodeDetailDto } from "@/types";

// Mock dependencies
vi.mock("@/lib/api-client");
vi.mock("@/lib/services/logger.client");
vi.mock("@nanostores/react");
vi.mock("@/lib/validation/schemas");

// Mock validation module
vi.mock("@/lib/validation/box", () => ({
  createBoxSchema: {
    safeParse: vi.fn(),
  },
  updateBoxSchema: {
    safeParse: vi.fn(),
  },
}));

describe("useBoxForm", () => {
  const mockLocations: LocationDto[] = [
    {
      id: "loc-1",
      name: "Garage",
      path: "root.garage",
      workspace_id: "workspace-123",
      description: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: "loc-2",
      name: "Basement",
      path: "root.basement",
      workspace_id: "workspace-123",
      description: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];

  const mockQRCodes: QrCodeDetailDto[] = [
    {
      id: "qr-1",
      short_id: "QR-ABC123",
      box_id: null,
      status: "generated",
      workspace_id: "workspace-123",
    },
    {
      id: "qr-2",
      short_id: "QR-DEF456",
      box_id: null,
      status: "generated",
      workspace_id: "workspace-123",
    },
  ];

  const mockBoxData: BoxDto = {
    id: "box-1",
    short_id: "BOX123",
    name: "Test Box",
    description: "Test description",
    tags: ["electronics", "cables"],
    location_id: "loc-1",
    qr_code_id: "qr-1",
    workspace_id: "workspace-123",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    deleted_at: null,
    search_vector: null,
    location: {
      id: "loc-1",
      name: "Garage",
      path: "root.garage",
    },
    qr_code: {
      id: "qr-1",
      short_id: "QR-ABC123",
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup nano store mock
    const { useStore } = await import("@nanostores/react");
    (useStore as ReturnType<typeof vi.fn>).mockReturnValue("workspace-123");

    // Setup logger mock
    const { log } = await import("@/lib/services/logger.client");
    (log.error as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    // Setup validation mocks
    (createBoxSchema.safeParse as ReturnType<typeof vi.fn>).mockImplementation((data) => ({
      success: true,
      data,
    }));
    (updateBoxSchema.safeParse as ReturnType<typeof vi.fn>).mockImplementation((data) => ({
      success: true,
      data,
    }));
    (extractZodErrors as ReturnType<typeof vi.fn>).mockReturnValue({});

    // Setup API mock to use extractValidationErrors
    const { extractValidationErrors } = await import("@/lib/api-client");
    (extractValidationErrors as ReturnType<typeof vi.fn>).mockImplementation((error: ApiError) => error.details || {});

    // Setup default API mocks
    (apiFetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("/api/locations?")) return mockLocations;
      if (url.includes("/api/qr-codes?")) return mockQRCodes;
      if (url === "/api/boxes/box-1") return mockBoxData;
      return null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Form Initialization", () => {
    it("TC-BOX-FORM-001: should initialize form in create mode with empty state", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      expect(result.current.formState.name).toBe("");
      expect(result.current.formState.description).toBeNull();
      expect(result.current.formState.tags).toEqual([]);
      expect(result.current.formState.location_id).toBeNull();
      expect(result.current.formState.qr_code_id).toBeNull();
      expect(result.current.formState.isDirty).toBe(false);
      expect(result.current.currentWorkspaceId).toBe("workspace-123");

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });
    });

    it("TC-BOX-FORM-002: should initialize form in edit mode and load box data", async () => {
      const { result } = renderHook(() => useBoxForm("edit", "box-1", "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      expect(result.current.formState.name).toBe("Test Box");
      expect(result.current.formState.description).toBe("Test description");
      expect(result.current.formState.tags).toEqual(["electronics", "cables"]);
      expect(result.current.formState.location_id).toBe("loc-1");
      expect(result.current.formState.qr_code_id).toBe("qr-1");
      expect(result.current.formState.currentBox).toEqual(mockBoxData);
    });

    it("TC-BOX-FORM-003: should load workspace ID from nano store if not provided", async () => {
      const { result } = renderHook(() => useBoxForm("create"));

      expect(result.current.currentWorkspaceId).toBe("workspace-123");

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });
    });

    it("should load locations and QR codes on mount", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      expect(result.current.formState.availableLocations).toEqual(mockLocations);
      expect(result.current.formState.availableQRCodes).toEqual(mockQRCodes);
    });
  });

  describe("Field Management", () => {
    it("TC-BOX-FORM-004: should update form field and clear error for that field", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      act(() => {
        result.current.setErrors({ name: "Name is required" });
      });

      expect(result.current.formState.errors.name).toBe("Name is required");

      act(() => {
        result.current.setFormField("name", "New Box Name");
      });

      expect(result.current.formState.name).toBe("New Box Name");
      expect(result.current.formState.errors.name).toBeUndefined();
    });

    it("should reset form to initial state", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      act(() => {
        result.current.setFormField("name", "Changed Name");
        result.current.setFormField("description", "Changed description");
      });

      expect(result.current.formState.name).toBe("Changed Name");

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.formState.name).toBe("");
      expect(result.current.formState.description).toBeNull();
    });
  });

  describe("Dirty State Tracking", () => {
    it("TC-BOX-FORM-005: should track dirty state when fields change", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      expect(result.current.formState.isDirty).toBe(false);

      act(() => {
        result.current.setFormField("name", "Changed");
      });

      await waitFor(() => {
        expect(result.current.formState.isDirty).toBe(true);
      });
    });

    it("should detect dirty state for tags using JSON comparison", async () => {
      const { result } = renderHook(() => useBoxForm("edit", "box-1", "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      expect(result.current.formState.isDirty).toBe(false);

      act(() => {
        result.current.setFormField("tags", ["electronics", "cables", "new-tag"]);
      });

      await waitFor(() => {
        expect(result.current.formState.isDirty).toBe(true);
      });
    });
  });

  describe("Form Validation", () => {
    it("TC-BOX-FORM-006: should validate form based on name field", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      expect(result.current.isFormValid).toBe(false);

      act(() => {
        result.current.setFormField("name", "Valid Name");
      });

      expect(result.current.isFormValid).toBe(true);
    });
  });

  describe("Form Submission - Create Mode", () => {
    it("TC-BOX-FORM-007: should submit form in create mode with all fields", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      act(() => {
        result.current.setFormField("name", "New Box");
        result.current.setFormField("description", "Description");
        result.current.setFormField("tags", ["tag1", "tag2"]);
      });

      // Mock the POST request
      (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "new-box-id" });

      await act(async () => {
        await result.current.submitForm();
      });

      expect(apiFetch).toHaveBeenCalledWith(
        "/api/boxes",
        expect.objectContaining({
          method: "POST",
        })
      );

      expect(result.current.formState.isSaving).toBe(false);
      expect(result.current.formState.errors).toEqual({});
    });
  });

  describe("Form Submission - Edit Mode", () => {
    it("TC-BOX-FORM-008: should submit only changed fields in edit mode", async () => {
      const { result } = renderHook(() => useBoxForm("edit", "box-1", "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      act(() => {
        result.current.setFormField("name", "Updated Box Name");
      });

      (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "box-1" });

      await act(async () => {
        await result.current.submitForm();
      });

      expect(apiFetch).toHaveBeenCalledWith(
        "/api/boxes/box-1",
        expect.objectContaining({
          method: "PATCH",
        })
      );
    });
  });

  describe("Form Submission - Validation Errors", () => {
    it("TC-BOX-FORM-009: should handle validation errors from schema", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      // Set up validation failure
      (createBoxSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        success: false,
        error: { issues: [] },
      });
      (extractZodErrors as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        name: "Name is required",
      });

      await expect(
        act(async () => {
          await result.current.submitForm();
        })
      ).rejects.toThrow("Validation failed");

      await waitFor(() => {
        expect(result.current.formState.errors).toEqual({ name: "Name is required" });
      });
    });

    it("should handle API validation errors (422)", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      act(() => {
        result.current.setFormField("name", "Test Box");
      });

      const apiError = new ApiError(422, "Validation failed", {
        name: "Name already exists",
      });
      (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(apiError);

      await expect(
        act(async () => {
          await result.current.submitForm();
        })
      ).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.formState.errors).toEqual({ name: "Name already exists" });
      });
    });
  });

  describe("Box Deletion", () => {
    it("TC-BOX-FORM-010: should delete box successfully", async () => {
      const { result } = renderHook(() => useBoxForm("edit", "box-1", "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      await act(async () => {
        await result.current.deleteBox();
      });

      expect(apiFetch).toHaveBeenCalledWith("/api/boxes/box-1", { method: "DELETE" });
    });

    it("should throw error if no box ID provided for deletion", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.deleteBox();
        })
      ).rejects.toThrow("No box ID provided for deletion");
    });
  });

  describe("QR Code Management", () => {
    it("TC-BOX-FORM-011: should generate QR code batch and reload available codes", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      const newQRCodes = [
        { id: "qr-3", short_id: "QR-GHI789", status: "generated" as const, workspace_id: "workspace-123" },
      ];

      (apiFetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(newQRCodes)
        .mockResolvedValueOnce([...mockQRCodes, ...newQRCodes]);

      await act(async () => {
        await result.current.generateQRCodeBatch(5);
      });

      expect(apiFetch).toHaveBeenCalledWith(
        "/api/qr-codes/batch",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  describe("Location Management", () => {
    it("TC-BOX-FORM-012: should generate suggested tags from location names", async () => {
      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      expect(result.current.suggestedTags).toContain("Garage");
      expect(result.current.suggestedTags).toContain("Basement");

      act(() => {
        result.current.setFormField("tags", ["Garage"]);
      });

      expect(result.current.suggestedTags).not.toContain("Garage");
      expect(result.current.suggestedTags).toContain("Basement");
    });
  });

  describe("Authentication Errors", () => {
    it("TC-BOX-FORM-013: should redirect to /auth on 401 error during submission", async () => {
      const originalLocation = window.location;
      delete (window as { location?: Location }).location;
      window.location = { href: "" } as Location;

      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      act(() => {
        result.current.setFormField("name", "Test Box");
      });

      const apiError = new ApiError(401, "Unauthorized");
      (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(apiError);

      try {
        await act(async () => {
          await result.current.submitForm();
        });
      } catch {
        // Expected to throw, but redirect should still happen
      }

      expect(window.location.href).toBe("/auth");

      window.location = originalLocation;
    });
  });

  describe("Edge Cases", () => {
    it("should not load data when workspace ID is null", async () => {
      const { useStore } = await import("@nanostores/react");
      (useStore as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

      renderHook(() => useBoxForm("create"));

      // Wait a bit to ensure no calls are made
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not have called API endpoints
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("should handle empty available locations and QR codes", async () => {
      (apiFetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
        if (url.includes("/api/locations?")) return [];
        if (url.includes("/api/qr-codes?")) return [];
        return null;
      });

      const { result } = renderHook(() => useBoxForm("create", undefined, "workspace-123"));

      await waitFor(() => {
        expect(result.current.formState.isLoading).toBe(false);
      });

      expect(result.current.formState.availableLocations).toEqual([]);
      expect(result.current.formState.availableQRCodes).toEqual([]);
      expect(result.current.suggestedTags).toEqual([]);
    });
  });
});

/**
 * Unit Tests for useForm Hook
 *
 * Tests the custom form state management hook with validation and submission.
 *
 * Business Rules:
 * - Initializes form with provided initial values
 * - Tracks field values, errors, touched state, and dirty state
 * - Validates form using optional Zod schema
 * - isDirty is calculated via JSON.stringify comparison with initial values
 * - handleSubmit validates before calling onSubmit callback
 * - Form auto-resets to initial values after successful submission
 * - Field-level validation on blur (when touched becomes false)
 * - Supports batch error setting and individual field error setting
 * - Errors are extracted from Zod ZodError objects
 * - Logger errors on submission failures
 *
 * Coverage Target: 80-90%
 * Test Count: ~30-35 tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm } from "@/components/hooks/useForm";
import { z } from "zod";
import { log } from "@/lib/services/logger.client";

// Mock logger to prevent console noise during tests
vi.mock("@/lib/services/logger.client", () => ({
  log: {
    error: vi.fn(),
  },
}));

describe("useForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test schemas
  const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  });

  const registrationSchema = z
    .object({
      email: z.string().email("Invalid email format"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });

  const boxSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });

  describe("Form initialization", () => {
    it("TC-FORM-001: should initialize with provided initial values", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });

    it("should initialize with complex initial values", () => {
      const initialValues = {
        name: "Test Box",
        description: "A test description",
        tags: ["tag1", "tag2"],
        count: 5,
        active: true,
      };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.isDirty).toBe(false);
    });

    it("should initialize with validation schema", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: loginSchema,
          onSubmit,
        })
      );

      expect(result.current.values).toEqual(initialValues);
    });
  });

  describe("Single field updates", () => {
    it("TC-FORM-002: should update single field value", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("email", "test@example.com");
      });

      expect(result.current.values.email).toBe("test@example.com");
      expect(result.current.values.password).toBe("");
    });

    it("should update multiple fields sequentially", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("email", "user@test.com");
      });

      act(() => {
        result.current.setFieldValue("password", "password123");
      });

      expect(result.current.values).toEqual({
        email: "user@test.com",
        password: "password123",
      });
    });

    it("should update field with different types", () => {
      const initialValues = {
        name: "",
        count: 0,
        active: false,
        tags: [] as string[],
      };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("name", "Test Name");
        result.current.setFieldValue("count", 10);
        result.current.setFieldValue("active", true);
        result.current.setFieldValue("tags", ["tag1", "tag2"]);
      });

      expect(result.current.values).toEqual({
        name: "Test Name",
        count: 10,
        active: true,
        tags: ["tag1", "tag2"],
      });
    });
  });

  describe("Touched field tracking", () => {
    it("TC-FORM-003: should mark field as touched", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldTouched("email", true);
      });

      expect(result.current.touched.email).toBe(true);
      expect(result.current.touched.password).toBeUndefined();
    });

    it("should mark multiple fields as touched", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldTouched("email", true);
        result.current.setFieldTouched("password", true);
      });

      expect(result.current.touched).toEqual({
        email: true,
        password: true,
      });
    });

    it("TC-FORM-004: should validate field when touched becomes false (blur)", () => {
      const initialValues = { email: "", password: "short" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: loginSchema,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldTouched("password", false);
      });

      expect(result.current.errors.password).toBe("Password must be at least 8 characters");
    });

    it("should remove error when field becomes valid on blur", () => {
      const initialValues = { email: "valid@example.com", password: "password123" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: loginSchema,
          onSubmit,
        })
      );

      // First set an error
      act(() => {
        result.current.setFieldError("email", "Some error");
      });

      expect(result.current.errors.email).toBe("Some error");

      // Now validate on blur with valid value
      act(() => {
        result.current.setFieldTouched("email", false);
      });

      expect(result.current.errors.email).toBeUndefined();
    });
  });

  describe("Zod validation integration", () => {
    it("TC-FORM-005: should extract errors from Zod schema", () => {
      const initialValues = { email: "invalid-email", password: "short" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: loginSchema,
          onSubmit,
        })
      );

      act(() => {
        result.current.handleSubmit();
      });

      expect(result.current.errors.email).toBe("Invalid email format");
      expect(result.current.errors.password).toBe("Password must be at least 8 characters");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should handle custom Zod refine validation", () => {
      const initialValues = {
        email: "user@example.com",
        password: "password123",
        confirmPassword: "different",
      };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: registrationSchema,
          onSubmit,
        })
      );

      act(() => {
        result.current.handleSubmit();
      });

      expect(result.current.errors.confirmPassword).toBe("Passwords do not match");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should validate successfully with valid data", async () => {
      const initialValues = {
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password123",
      };
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: registrationSchema,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.errors).toEqual({});
    });

    it("should work without validation schema", async () => {
      const initialValues = { name: "" };
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.errors).toEqual({});
    });
  });

  describe("isDirty calculation", () => {
    it("TC-FORM-006: should calculate isDirty using JSON.stringify comparison", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.setFieldValue("email", "test@example.com");
      });

      expect(result.current.isDirty).toBe(true);
    });

    it("should set isDirty to false when values match initial", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("email", "test@example.com");
      });

      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.setFieldValue("email", "");
      });

      expect(result.current.isDirty).toBe(false);
    });

    it("should detect changes in complex objects", () => {
      const initialValues = {
        name: "Box",
        tags: ["tag1"],
        metadata: { count: 5 },
      };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.setFieldValue("tags", ["tag1", "tag2"]);
      });

      expect(result.current.isDirty).toBe(true);
    });
  });

  describe("Form submission", () => {
    it("TC-FORM-007: should validate before calling onSubmit", async () => {
      const initialValues = { email: "invalid", password: "short" };
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: loginSchema,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).not.toHaveBeenCalled();
      expect(result.current.errors).not.toEqual({});
    });

    it("TC-FORM-008: should call onSubmit when validation passes", async () => {
      const initialValues = { email: "user@example.com", password: "password123" };
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: loginSchema,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalledWith(initialValues);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("should set isSubmitting during submission", async () => {
      const initialValues = { email: "user@example.com", password: "password123" };
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      const onSubmit = vi.fn().mockReturnValue(submitPromise);

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: loginSchema,
          onSubmit,
        })
      );

      expect(result.current.isSubmitting).toBe(false);

      act(() => {
        result.current.handleSubmit();
      });

      // Should be true during submission
      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        resolveSubmit();
        await submitPromise;
      });

      // Should be false after submission
      expect(result.current.isSubmitting).toBe(false);
    });

    it("should prevent form event default behavior", async () => {
      const initialValues = { email: "user@example.com", password: "password123" };
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should handle submission without event", async () => {
      const initialValues = { email: "user@example.com", password: "password123" };
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe("Auto-reset after submission", () => {
    it("TC-FORM-009: should reset form to initial values after successful submission", async () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      // Change values
      act(() => {
        result.current.setFieldValue("email", "user@example.com");
        result.current.setFieldValue("password", "password123");
      });

      expect(result.current.values).toEqual({
        email: "user@example.com",
        password: "password123",
      });
      expect(result.current.isDirty).toBe(true);

      // Submit
      await act(async () => {
        await result.current.handleSubmit();
      });

      // Should reset to initial values
      expect(result.current.values).toEqual(initialValues);
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });

    it("should not reset form when submission fails", async () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn().mockRejectedValue(new Error("Submission failed"));

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("email", "user@example.com");
        result.current.setFieldValue("password", "password123");
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      // Should NOT reset - values should remain
      expect(result.current.values).toEqual({
        email: "user@example.com",
        password: "password123",
      });
      expect(result.current.isDirty).toBe(true);
      expect(log.error).toHaveBeenCalledWith(
        "useForm submission error",
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });
  });

  describe("Manual form reset", () => {
    it("TC-FORM-010: should reset form to initial values manually", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      // Change values and add errors
      act(() => {
        result.current.setFieldValue("email", "user@example.com");
        result.current.setFieldValue("password", "password123");
        result.current.setFieldTouched("email", true);
        result.current.setFieldError("email", "Some error");
      });

      expect(result.current.isDirty).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe("Field error setting", () => {
    it("TC-FORM-011: should set error for individual field", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldError("email", "Email is required");
      });

      expect(result.current.errors.email).toBe("Email is required");
      expect(result.current.errors.password).toBeUndefined();
    });

    it("should clear error when setting to null", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldError("email", "Email is required");
      });

      expect(result.current.errors.email).toBe("Email is required");

      act(() => {
        result.current.setFieldError("email", null);
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it("should update existing error", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldError("email", "First error");
      });

      expect(result.current.errors.email).toBe("First error");

      act(() => {
        result.current.setFieldError("email", "Second error");
      });

      expect(result.current.errors.email).toBe("Second error");
    });
  });

  describe("Batch error setting", () => {
    it("TC-FORM-012: should set multiple errors at once", () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setErrors({
          email: "Email is invalid",
          password: "Password is too short",
        });
      });

      expect(result.current.errors).toEqual({
        email: "Email is invalid",
        password: "Password is too short",
      });
    });

    it("should replace all errors when setting batch", () => {
      const initialValues = { email: "", password: "", username: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setErrors({
          email: "Email error",
          password: "Password error",
        });
      });

      expect(result.current.errors).toEqual({
        email: "Email error",
        password: "Password error",
      });

      act(() => {
        result.current.setErrors({
          username: "Username error",
        });
      });

      expect(result.current.errors).toEqual({
        username: "Username error",
      });
    });
  });

  describe("Custom validation schema", () => {
    it("TC-FORM-013: should work with optional schema parameter", async () => {
      const initialValues = { name: "", description: "" };
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      // Should submit without validation
      expect(onSubmit).toHaveBeenCalledWith(initialValues);
      expect(result.current.errors).toEqual({});
    });

    it("should validate with complex schema including arrays", () => {
      const initialValues = {
        name: "",
        description: "Valid description",
        tags: [] as string[],
      };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: boxSchema,
          onSubmit,
        })
      );

      act(() => {
        result.current.handleSubmit();
      });

      expect(result.current.errors.name).toBe("Name is required");
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle complete login form flow", async () => {
      const initialValues = { email: "", password: "" };
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: loginSchema,
          onSubmit,
        })
      );

      // User types email
      act(() => {
        result.current.setFieldValue("email", "user@example.com");
      });

      // User blurs email field
      act(() => {
        result.current.setFieldTouched("email", false);
      });

      expect(result.current.errors.email).toBeUndefined();

      // User types password
      act(() => {
        result.current.setFieldValue("password", "password123");
      });

      // User submits form
      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
      expect(result.current.values).toEqual(initialValues);
    });

    it("should handle registration form with password mismatch", async () => {
      const initialValues = {
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password456",
      };
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: registrationSchema,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.errors.confirmPassword).toBe("Passwords do not match");
      expect(onSubmit).not.toHaveBeenCalled();

      // Fix password
      act(() => {
        result.current.setFieldValue("confirmPassword", "password123");
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.errors).toEqual({});
    });

    it("should handle server validation errors", async () => {
      const initialValues = { email: "user@example.com", password: "password123" };
      const onSubmit = vi.fn().mockRejectedValue({
        message: "Invalid credentials",
      });

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: loginSchema,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      // Set server errors manually
      act(() => {
        result.current.setErrors({
          email: "Email not found",
          password: "Incorrect password",
        });
      });

      expect(result.current.errors).toEqual({
        email: "Email not found",
        password: "Incorrect password",
      });
      expect(result.current.values).toEqual(initialValues);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string values", () => {
      const initialValues = { name: "Initial" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("name", "");
      });

      expect(result.current.values.name).toBe("");
      expect(result.current.isDirty).toBe(true);
    });

    it("should handle null values", () => {
      const initialValues = { description: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("description", null);
      });

      expect(result.current.values.description).toBeNull();
    });

    it("should handle zero values", () => {
      const initialValues = { count: 10 };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("count", 0);
      });

      expect(result.current.values.count).toBe(0);
      expect(result.current.isDirty).toBe(true);
    });

    it("should handle false boolean values", () => {
      const initialValues = { active: true };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("active", false);
      });

      expect(result.current.values.active).toBe(false);
      expect(result.current.isDirty).toBe(true);
    });

    it("should handle rapid field updates", () => {
      const initialValues = { name: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("name", "a");
        result.current.setFieldValue("name", "ab");
        result.current.setFieldValue("name", "abc");
        result.current.setFieldValue("name", "abcd");
      });

      expect(result.current.values.name).toBe("abcd");
    });

    it("should handle array field updates", () => {
      const initialValues = { tags: [] as string[] };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("tags", ["tag1", "tag2", "tag3"]);
      });

      expect(result.current.values.tags).toEqual(["tag1", "tag2", "tag3"]);
      expect(result.current.isDirty).toBe(true);
    });

    it("should handle object field updates", () => {
      const initialValues = { metadata: {} as Record<string, unknown> };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      act(() => {
        result.current.setFieldValue("metadata", { key: "value", count: 42 });
      });

      expect(result.current.values.metadata).toEqual({ key: "value", count: 42 });
    });
  });

  describe("Return object structure", () => {
    it("should return all required properties", () => {
      const initialValues = { email: "" };
      const onSubmit = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      expect(result.current).toHaveProperty("values");
      expect(result.current).toHaveProperty("errors");
      expect(result.current).toHaveProperty("touched");
      expect(result.current).toHaveProperty("isDirty");
      expect(result.current).toHaveProperty("isSubmitting");
      expect(result.current).toHaveProperty("setFieldValue");
      expect(result.current).toHaveProperty("setFieldTouched");
      expect(result.current).toHaveProperty("setErrors");
      expect(result.current).toHaveProperty("setFieldError");
      expect(result.current).toHaveProperty("handleSubmit");
      expect(result.current).toHaveProperty("reset");
    });

    it("should return functions that are stable between renders", () => {
      const initialValues = { email: "" };
      const onSubmit = vi.fn();

      const { result, rerender } = renderHook(() =>
        useForm({
          initialValues,
          onSubmit,
        })
      );

      const firstRenderFunctions = {
        setFieldValue: result.current.setFieldValue,
        setFieldTouched: result.current.setFieldTouched,
        setErrors: result.current.setErrors,
        setFieldError: result.current.setFieldError,
        handleSubmit: result.current.handleSubmit,
        reset: result.current.reset,
      };

      rerender();

      expect(result.current.setFieldValue).toBe(firstRenderFunctions.setFieldValue);
      expect(result.current.setFieldTouched).toBe(firstRenderFunctions.setFieldTouched);
      expect(result.current.setErrors).toBe(firstRenderFunctions.setErrors);
      expect(result.current.setFieldError).toBe(firstRenderFunctions.setFieldError);
      expect(result.current.reset).toBe(firstRenderFunctions.reset);
    });
  });
});

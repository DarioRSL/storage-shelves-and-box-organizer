/**
 * Example Unit Test
 *
 * This test verifies that the Vitest setup is working correctly.
 * Delete or modify this file when you start writing real tests.
 */

import { describe, it, expect, vi } from "vitest";

describe("Vitest Setup Verification", () => {
  it("should run basic assertions", () => {
    expect(true).toBe(true);
    expect(1 + 1).toBe(2);
  });

  it("should handle async operations", async () => {
    const asyncOperation = async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve("success"), 100);
      });
    };

    const result = await asyncOperation();
    expect(result).toBe("success");
  });

  it("should support mocking functions", () => {
    const mockFn = vi.fn((x: number) => x * 2);

    const result = mockFn(5);

    expect(result).toBe(10);
    expect(mockFn).toHaveBeenCalledWith(5);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should support spying on objects", () => {
    const calculator = {
      add: (a: number, b: number) => a + b,
      subtract: (a: number, b: number) => a - b,
    };

    const addSpy = vi.spyOn(calculator, "add");

    const result = calculator.add(2, 3);

    expect(result).toBe(5);
    expect(addSpy).toHaveBeenCalledWith(2, 3);
  });

  it("should have access to testing-library matchers", () => {
    const element = document.createElement("div");
    element.textContent = "Hello World";
    document.body.appendChild(element);

    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent("Hello World");

    // Cleanup
    document.body.removeChild(element);
  });
});

// Example: Testing a simple utility function
describe("Example Utility Function Test", () => {
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  it("should convert text to slug format", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("Test  Multiple   Spaces")).toBe("test-multiple-spaces");
    expect(slugify("Special!@#Characters")).toBe("specialcharacters");
  });

  it("should handle edge cases", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("---")).toBe("");
  });
});

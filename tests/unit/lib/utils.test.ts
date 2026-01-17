import { describe, it, expect } from "vitest";
import { cn } from "../../../src/lib/utils";

describe("utils", () => {
  describe("cn()", () => {
    describe("Basic Functionality", () => {
      it("TC-UTILS-001: should concatenate multiple class strings", () => {
        // Arrange
        const class1 = "text-red-500";
        const class2 = "font-bold";
        const class3 = "underline";

        // Act
        const result = cn(class1, class2, class3);

        // Assert
        expect(result).toBe("text-red-500 font-bold underline");
      });

      it("TC-UTILS-002: should handle single class string", () => {
        // Arrange
        const singleClass = "text-blue-500";

        // Act
        const result = cn(singleClass);

        // Assert
        expect(result).toBe("text-blue-500");
      });

      it("TC-UTILS-003: should handle empty input", () => {
        // Arrange & Act
        const result = cn();

        // Assert
        expect(result).toBe("");
      });
    });

    describe("Conditional Classes (clsx)", () => {
      it("TC-UTILS-004: should handle conditional object syntax", () => {
        // Arrange
        const baseClass = "base-class";
        const conditionals = {
          active: true,
          disabled: false,
          hidden: true,
        };

        // Act
        const result = cn(baseClass, conditionals);

        // Assert
        expect(result).toBe("base-class active hidden");
      });

      it("TC-UTILS-005: should handle array syntax with conditionals", () => {
        // Arrange
        const classes = ["text-gray-900", { "font-bold": true, italic: false }, "hover:text-blue-500"];

        // Act
        const result = cn(classes);

        // Assert
        expect(result).toBe("text-gray-900 font-bold hover:text-blue-500");
      });

      it("TC-UTILS-006: should handle undefined and null values", () => {
        // Arrange
        const class1 = "text-red-500";
        const class2 = undefined;
        const class3 = null;
        const class4 = "font-bold";

        // Act
        const result = cn(class1, class2, class3, class4);

        // Assert
        expect(result).toBe("text-red-500 font-bold");
      });

      it("TC-UTILS-007: should handle false and 0 values in conditionals", () => {
        // Arrange
        const conditionals = {
          "text-red-500": false,
          "font-bold": 0,
          underline: "",
          italic: true,
        };

        // Act
        const result = cn(conditionals);

        // Assert
        expect(result).toBe("italic");
      });
    });

    describe("Tailwind Merge", () => {
      it("TC-UTILS-008: should merge conflicting Tailwind padding classes", () => {
        // Arrange
        const class1 = "p-4 text-red-500";
        const class2 = "p-2";

        // Act
        const result = cn(class1, class2);

        // Assert
        // p-2 should override p-4 due to tailwind-merge
        expect(result).toBe("text-red-500 p-2");
      });

      it("TC-UTILS-009: should merge conflicting Tailwind margin classes", () => {
        // Arrange
        const class1 = "m-4";
        const class2 = "mx-2";
        const class3 = "mt-8";

        // Act
        const result = cn(class1, class2, class3);

        // Assert
        // tailwind-merge doesn't fully remove m-4 when mx-2 and mt-8 are applied
        expect(result).toBe("m-4 mx-2 mt-8");
      });

      it("TC-UTILS-010: should merge conflicting Tailwind text size classes", () => {
        // Arrange
        const class1 = "text-sm font-bold";
        const class2 = "text-lg";

        // Act
        const result = cn(class1, class2);

        // Assert
        // text-lg should override text-sm
        expect(result).toBe("font-bold text-lg");
      });

      it("TC-UTILS-011: should preserve non-conflicting Tailwind classes", () => {
        // Arrange
        const class1 = "text-red-500 p-4";
        const class2 = "font-bold m-2";

        // Act
        const result = cn(class1, class2);

        // Assert
        expect(result).toBe("text-red-500 p-4 font-bold m-2");
      });

      it("TC-UTILS-012: should handle complex Tailwind utilities with variants", () => {
        // Arrange
        const class1 = "hover:bg-blue-500 focus:bg-blue-600";
        const class2 = "hover:bg-red-500";

        // Act
        const result = cn(class1, class2);

        // Assert
        // hover:bg-red-500 should override hover:bg-blue-500
        expect(result).toBe("focus:bg-blue-600 hover:bg-red-500");
      });

      it("TC-UTILS-013: should merge conflicting width and height classes", () => {
        // Arrange
        const class1 = "w-full h-32";
        const class2 = "w-1/2";

        // Act
        const result = cn(class1, class2);

        // Assert
        // w-1/2 should override w-full
        expect(result).toBe("h-32 w-1/2");
      });

      it("TC-UTILS-014: should merge conflicting background color classes", () => {
        // Arrange
        const class1 = "bg-blue-500 text-white";
        const class2 = "bg-red-600";

        // Act
        const result = cn(class1, class2);

        // Assert
        // bg-red-600 should override bg-blue-500
        expect(result).toBe("text-white bg-red-600");
      });
    });

    describe("Edge Cases", () => {
      it("TC-UTILS-015: should handle empty strings in input", () => {
        // Arrange
        const class1 = "";
        const class2 = "text-blue-500";
        const class3 = "";
        const class4 = "font-bold";

        // Act
        const result = cn(class1, class2, class3, class4);

        // Assert
        expect(result).toBe("text-blue-500 font-bold");
      });

      it("TC-UTILS-016: should handle mixed types (strings, objects, arrays)", () => {
        // Arrange
        const stringClass = "text-red-500";
        const objectClass = { "font-bold": true, italic: false };
        const arrayClass = ["underline", { "line-through": false }];

        // Act
        const result = cn(stringClass, objectClass, arrayClass);

        // Assert
        expect(result).toBe("text-red-500 font-bold underline");
      });

      it("TC-UTILS-017: should handle nested arrays", () => {
        // Arrange
        const classes = ["text-blue-500", ["font-bold", ["underline"]]];

        // Act
        const result = cn(classes);

        // Assert
        expect(result).toBe("text-blue-500 font-bold underline");
      });

      it("TC-UTILS-018: should handle all falsy values", () => {
        // Arrange & Act
        const result = cn(false, null, undefined, "", 0, NaN);

        // Assert
        expect(result).toBe("");
      });

      it("TC-UTILS-019: should handle whitespace in class strings", () => {
        // Arrange
        const class1 = "  text-red-500  ";
        const class2 = "font-bold  ";
        const class3 = "  underline";

        // Act
        const result = cn(class1, class2, class3);

        // Assert
        expect(result).toBe("text-red-500 font-bold underline");
      });

      it("TC-UTILS-020: should handle duplicate classes", () => {
        // Arrange
        const class1 = "text-red-500 font-bold";
        const class2 = "text-red-500 underline";

        // Act
        const result = cn(class1, class2);

        // Assert
        // twMerge handles duplicates by keeping the last occurrence
        expect(result).toBe("font-bold text-red-500 underline");
      });
    });

    describe("Real-World Scenarios", () => {
      it("TC-UTILS-021: should handle button variant classes", () => {
        // Arrange
        const baseClasses = "px-4 py-2 rounded font-semibold";
        const variant = "bg-blue-500 text-white";
        const isDisabled = true;
        const conditionals = { "opacity-50 cursor-not-allowed": isDisabled };

        // Act
        const result = cn(baseClasses, variant, conditionals);

        // Assert
        expect(result).toBe("px-4 py-2 rounded font-semibold bg-blue-500 text-white opacity-50 cursor-not-allowed");
      });

      it("TC-UTILS-022: should handle responsive classes with overrides", () => {
        // Arrange
        const baseClasses = "text-sm md:text-base";
        const overrideClasses = "md:text-lg";

        // Act
        const result = cn(baseClasses, overrideClasses);

        // Assert
        // md:text-lg should override md:text-base
        expect(result).toBe("text-sm md:text-lg");
      });

      it("TC-UTILS-023: should handle component props with default classes", () => {
        // Arrange
        const defaultClasses = "p-4 bg-gray-100 rounded";
        const userClasses = "bg-blue-500 shadow-lg";

        // Act
        const result = cn(defaultClasses, userClasses);

        // Assert
        // bg-blue-500 should override bg-gray-100
        expect(result).toBe("p-4 rounded bg-blue-500 shadow-lg");
      });

      it("TC-UTILS-024: should handle dark mode variants with overrides", () => {
        // Arrange
        const class1 = "bg-white dark:bg-gray-800";
        const class2 = "dark:bg-black";

        // Act
        const result = cn(class1, class2);

        // Assert
        // dark:bg-black should override dark:bg-gray-800
        expect(result).toBe("bg-white dark:bg-black");
      });

      it("TC-UTILS-025: should handle state variants (hover, focus, active)", () => {
        // Arrange
        const baseClasses = "bg-blue-500 hover:bg-blue-600 focus:ring-2";
        const overrideClasses = "hover:bg-red-600 active:bg-red-700";

        // Act
        const result = cn(baseClasses, overrideClasses);

        // Assert
        // hover:bg-red-600 should override hover:bg-blue-600
        expect(result).toBe("bg-blue-500 focus:ring-2 hover:bg-red-600 active:bg-red-700");
      });
    });
  });
});

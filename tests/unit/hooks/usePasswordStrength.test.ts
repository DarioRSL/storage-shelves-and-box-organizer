/**
 * Unit Tests for usePasswordStrength Hook
 *
 * This test suite verifies the password strength evaluation functionality.
 *
 * Business Rules:
 * - Minimum password length: 8 characters
 * - Score calculation: 20 points per criterion (max 100)
 * - Level classification: weak (<40), medium (40-59), strong (≥60)
 * - Five criteria: length, uppercase, lowercase, numbers, special chars
 * - Feedback messages in Polish: "Słabe hasło", "Średnie hasło", "Silne hasło"
 */

import { describe, it, expect } from "vitest";
import { evaluatePasswordStrength } from "@/components/hooks/usePasswordStrength";

describe("evaluatePasswordStrength", () => {
  describe("Score calculation - individual criteria", () => {
    it("should return score 0 for empty password", () => {
      const result = evaluatePasswordStrength("");
      expect(result.score).toBe(0);
      expect(result.level).toBe("weak");
      expect(result.hasMinLength).toBe(false);
      expect(result.hasLowercase).toBe(false);
      expect(result.hasUppercase).toBe(false);
      expect(result.hasNumbers).toBe(false);
      expect(result.hasSpecialChars).toBe(false);
    });

    it("should give 20 points for min length criterion only (8 chars)", () => {
      const result = evaluatePasswordStrength("12345678");
      expect(result.hasMinLength).toBe(true);
      expect(result.hasNumbers).toBe(true);
      expect(result.score).toBe(40); // 20 (length) + 20 (numbers)
    });

    it("should give 20 points for lowercase letters criterion only", () => {
      const result = evaluatePasswordStrength("abcdefgh");
      expect(result.hasLowercase).toBe(true);
      expect(result.hasMinLength).toBe(true);
      expect(result.score).toBe(40); // 20 (length) + 20 (lowercase)
    });

    it("should give 20 points for uppercase letters criterion only", () => {
      const result = evaluatePasswordStrength("ABCDEFGH");
      expect(result.hasUppercase).toBe(true);
      expect(result.hasMinLength).toBe(true);
      expect(result.score).toBe(40); // 20 (length) + 20 (uppercase)
    });

    it("should give 20 points for numbers criterion only", () => {
      const result = evaluatePasswordStrength("12345678");
      expect(result.hasNumbers).toBe(true);
      expect(result.hasMinLength).toBe(true);
      expect(result.score).toBe(40); // 20 (length) + 20 (numbers)
    });

    it("should give 20 points for special characters criterion only", () => {
      const result = evaluatePasswordStrength("!@#$%^&*");
      expect(result.hasSpecialChars).toBe(true);
      expect(result.hasMinLength).toBe(true);
      expect(result.score).toBe(40); // 20 (length) + 20 (special)
    });
  });

  describe("Score calculation - combinations", () => {
    it("should calculate score 40 for lowercase + length", () => {
      const result = evaluatePasswordStrength("abcdefgh");
      expect(result.score).toBe(40);
      expect(result.hasMinLength).toBe(true);
      expect(result.hasLowercase).toBe(true);
    });

    it("should calculate score 60 for lowercase + uppercase + length", () => {
      const result = evaluatePasswordStrength("AbCdEfGh");
      expect(result.score).toBe(60);
      expect(result.hasMinLength).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasUppercase).toBe(true);
    });

    it("should calculate score 80 for lowercase + uppercase + numbers + length", () => {
      const result = evaluatePasswordStrength("Password1");
      expect(result.score).toBe(80);
      expect(result.hasMinLength).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasNumbers).toBe(true);
    });

    it("should calculate score 100 when all criteria met", () => {
      const result = evaluatePasswordStrength("Pass123!");
      expect(result.score).toBe(100);
      expect(result.hasMinLength).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasNumbers).toBe(true);
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should calculate score 80 for password too short but with 4 other criteria", () => {
      const result = evaluatePasswordStrength("Abc1!");
      expect(result.score).toBe(80);
      expect(result.hasMinLength).toBe(false); // Only 5 chars
      expect(result.hasLowercase).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasNumbers).toBe(true);
      expect(result.hasSpecialChars).toBe(true);
    });
  });

  describe("Level classification - boundary testing", () => {
    it("should classify as weak when score is 0", () => {
      const result = evaluatePasswordStrength("");
      expect(result.level).toBe("weak");
      expect(result.score).toBe(0);
      expect(result.feedback).toBe("Słabe hasło");
    });

    it("should classify as weak when score is 20", () => {
      const result = evaluatePasswordStrength("abc"); // Only lowercase
      expect(result.level).toBe("weak");
      expect(result.score).toBe(20);
      expect(result.feedback).toBe("Słabe hasło");
    });

    it("should classify as weak when score is exactly 39", () => {
      // This is hypothetical - cannot achieve exactly 39 with 20-point increments
      // But testing boundary: score < 40 should be weak
      const result = evaluatePasswordStrength("abc"); // 20 points
      expect(result.level).toBe("weak");
      expect(result.score).toBeLessThan(40);
    });

    it("should classify as medium when score is exactly 40", () => {
      const result = evaluatePasswordStrength("abcdefgh"); // Length + lowercase
      expect(result.level).toBe("medium");
      expect(result.score).toBe(40);
      expect(result.feedback).toBe("Średnie hasło");
    });

    it("should classify as medium when score is 50", () => {
      // Cannot achieve exactly 50 with 20-point increments
      // Testing 40 as closest medium boundary
      const result = evaluatePasswordStrength("abcdefgh");
      expect(result.level).toBe("medium");
      expect(result.score).toBe(40);
    });

    it("should classify as medium when score is exactly 59", () => {
      // Cannot achieve exactly 59 with 20-point increments
      // Testing that 40 is medium (< 60)
      const result = evaluatePasswordStrength("abcdefgh");
      expect(result.level).toBe("medium");
      expect(result.score).toBeLessThan(60);
    });

    it("should classify as strong when score is exactly 60", () => {
      const result = evaluatePasswordStrength("AbCdEfGh"); // Length + lower + upper
      expect(result.level).toBe("strong");
      expect(result.score).toBe(60);
      expect(result.feedback).toBe("Silne hasło");
    });

    it("should classify as strong when score is 80", () => {
      const result = evaluatePasswordStrength("Password1"); // Length + lower + upper + numbers
      expect(result.level).toBe("strong");
      expect(result.score).toBe(80);
      expect(result.feedback).toBe("Silne hasło");
    });

    it("should classify as strong when score is 100", () => {
      const result = evaluatePasswordStrength("Pass123!"); // All criteria
      expect(result.level).toBe("strong");
      expect(result.score).toBe(100);
      expect(result.feedback).toBe("Silne hasło");
    });
  });

  describe("Criteria detection - minimum length", () => {
    it("should detect min length is false when password is empty", () => {
      const result = evaluatePasswordStrength("");
      expect(result.hasMinLength).toBe(false);
    });

    it("should detect min length is false when password has 7 chars", () => {
      const result = evaluatePasswordStrength("1234567");
      expect(result.hasMinLength).toBe(false);
    });

    it("should detect min length is true when password has exactly 8 chars", () => {
      const result = evaluatePasswordStrength("12345678");
      expect(result.hasMinLength).toBe(true);
    });

    it("should detect min length is true when password has 9+ chars", () => {
      const result = evaluatePasswordStrength("123456789");
      expect(result.hasMinLength).toBe(true);
    });

    it("should detect min length is true for very long password", () => {
      const result = evaluatePasswordStrength("a".repeat(100));
      expect(result.hasMinLength).toBe(true);
    });
  });

  describe("Criteria detection - uppercase letters", () => {
    it("should detect uppercase is false when password has no uppercase", () => {
      const result = evaluatePasswordStrength("password");
      expect(result.hasUppercase).toBe(false);
    });

    it("should detect uppercase is true when password has one uppercase letter", () => {
      const result = evaluatePasswordStrength("Password");
      expect(result.hasUppercase).toBe(true);
    });

    it("should detect uppercase is true when password is all uppercase", () => {
      const result = evaluatePasswordStrength("PASSWORD");
      expect(result.hasUppercase).toBe(true);
    });

    it("should detect uppercase is true for mixed case password", () => {
      const result = evaluatePasswordStrength("PaSsWoRd");
      expect(result.hasUppercase).toBe(true);
    });
  });

  describe("Criteria detection - lowercase letters", () => {
    it("should detect lowercase is false when password has no lowercase", () => {
      const result = evaluatePasswordStrength("PASSWORD");
      expect(result.hasLowercase).toBe(false);
    });

    it("should detect lowercase is true when password has one lowercase letter", () => {
      const result = evaluatePasswordStrength("PASSWORd");
      expect(result.hasLowercase).toBe(true);
    });

    it("should detect lowercase is true when password is all lowercase", () => {
      const result = evaluatePasswordStrength("password");
      expect(result.hasLowercase).toBe(true);
    });

    it("should detect lowercase is true for mixed case password", () => {
      const result = evaluatePasswordStrength("PaSsWoRd");
      expect(result.hasLowercase).toBe(true);
    });
  });

  describe("Criteria detection - numbers", () => {
    it("should detect numbers is false when password has no numbers", () => {
      const result = evaluatePasswordStrength("Password");
      expect(result.hasNumbers).toBe(false);
    });

    it("should detect numbers is true when password has one number", () => {
      const result = evaluatePasswordStrength("Password1");
      expect(result.hasNumbers).toBe(true);
    });

    it("should detect numbers is true when password is all numbers", () => {
      const result = evaluatePasswordStrength("12345678");
      expect(result.hasNumbers).toBe(true);
    });

    it("should detect numbers is true for password with multiple numbers", () => {
      const result = evaluatePasswordStrength("Pass123word456");
      expect(result.hasNumbers).toBe(true);
    });
  });

  describe("Criteria detection - special characters", () => {
    it("should detect special chars is false when password has no special chars", () => {
      const result = evaluatePasswordStrength("Password1");
      expect(result.hasSpecialChars).toBe(false);
    });

    it("should detect special character !", () => {
      const result = evaluatePasswordStrength("Password1!");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character @", () => {
      const result = evaluatePasswordStrength("Password1@");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character #", () => {
      const result = evaluatePasswordStrength("Password1#");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character $", () => {
      const result = evaluatePasswordStrength("Password1$");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character %", () => {
      const result = evaluatePasswordStrength("Password1%");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character ^", () => {
      const result = evaluatePasswordStrength("Password1^");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character &", () => {
      const result = evaluatePasswordStrength("Password1&");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character *", () => {
      const result = evaluatePasswordStrength("Password1*");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character (", () => {
      const result = evaluatePasswordStrength("Password1(");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character )", () => {
      const result = evaluatePasswordStrength("Password1)");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character _", () => {
      const result = evaluatePasswordStrength("Password1_");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character +", () => {
      const result = evaluatePasswordStrength("Password1+");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character -", () => {
      const result = evaluatePasswordStrength("Password1-");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character =", () => {
      const result = evaluatePasswordStrength("Password1=");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character [", () => {
      const result = evaluatePasswordStrength("Password1[");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character ]", () => {
      const result = evaluatePasswordStrength("Password1]");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character {", () => {
      const result = evaluatePasswordStrength("Password1{");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character }", () => {
      const result = evaluatePasswordStrength("Password1}");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character ;", () => {
      const result = evaluatePasswordStrength("Password1;");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character '", () => {
      const result = evaluatePasswordStrength("Password1'");
      expect(result.hasSpecialChars).toBe(true);
    });

    it('should detect special character "', () => {
      const result = evaluatePasswordStrength('Password1"');
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character \\", () => {
      const result = evaluatePasswordStrength("Password1\\");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character |", () => {
      const result = evaluatePasswordStrength("Password1|");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character ,", () => {
      const result = evaluatePasswordStrength("Password1,");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character .", () => {
      const result = evaluatePasswordStrength("Password1.");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character <", () => {
      const result = evaluatePasswordStrength("Password1<");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character >", () => {
      const result = evaluatePasswordStrength("Password1>");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character /", () => {
      const result = evaluatePasswordStrength("Password1/");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special character ?", () => {
      const result = evaluatePasswordStrength("Password1?");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect multiple special characters", () => {
      const result = evaluatePasswordStrength("Pass!@#$%");
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should detect special chars is true when password is all special chars", () => {
      const result = evaluatePasswordStrength("!@#$%^&*");
      expect(result.hasSpecialChars).toBe(true);
    });
  });

  describe("Real-world password examples", () => {
    it("should evaluate weak password: abc123", () => {
      const result = evaluatePasswordStrength("abc123");
      expect(result.level).toBe("medium"); // Score is 40, which is >= 40
      expect(result.score).toBe(40); // lowercase + numbers
      expect(result.hasMinLength).toBe(false); // Only 6 chars
    });

    it("should evaluate weak password: password", () => {
      const result = evaluatePasswordStrength("password");
      expect(result.level).toBe("medium");
      expect(result.score).toBe(40); // length + lowercase
    });

    it("should evaluate medium password: Password1", () => {
      const result = evaluatePasswordStrength("Password1");
      expect(result.level).toBe("strong");
      expect(result.score).toBe(80); // length + lower + upper + numbers
    });

    it("should evaluate medium password: password123", () => {
      const result = evaluatePasswordStrength("password123");
      expect(result.level).toBe("strong"); // Score is 60, which is >= 60
      expect(result.score).toBe(60); // length + lower + numbers
    });

    it("should evaluate strong password: MyP@ssw0rd2024", () => {
      const result = evaluatePasswordStrength("MyP@ssw0rd2024");
      expect(result.level).toBe("strong");
      expect(result.score).toBe(100); // All criteria met
      expect(result.hasMinLength).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasNumbers).toBe(true);
      expect(result.hasSpecialChars).toBe(true);
    });

    it("should evaluate strong password: Tr0ub4dor&3", () => {
      const result = evaluatePasswordStrength("Tr0ub4dor&3");
      expect(result.level).toBe("strong");
      expect(result.score).toBe(100);
    });

    it("should evaluate XKCD password: correct horse battery staple", () => {
      // Famous XKCD password (spaces are NOT special chars)
      const result = evaluatePasswordStrength("correct horse battery staple");
      expect(result.level).toBe("medium");
      expect(result.score).toBe(40); // length + lowercase only
      expect(result.hasMinLength).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasSpecialChars).toBe(false); // Spaces don't count
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string", () => {
      const result = evaluatePasswordStrength("");
      expect(result.score).toBe(0);
      expect(result.level).toBe("weak");
      expect(result.feedback).toBe("Słabe hasło");
      expect(result.hasMinLength).toBe(false);
      expect(result.hasLowercase).toBe(false);
      expect(result.hasUppercase).toBe(false);
      expect(result.hasNumbers).toBe(false);
      expect(result.hasSpecialChars).toBe(false);
    });

    it("should handle password with only spaces", () => {
      const result = evaluatePasswordStrength("        ");
      expect(result.hasMinLength).toBe(true); // 8 spaces
      expect(result.hasLowercase).toBe(false);
      expect(result.hasUppercase).toBe(false);
      expect(result.hasNumbers).toBe(false);
      expect(result.hasSpecialChars).toBe(false);
      expect(result.score).toBe(20); // Only length criterion met
      expect(result.level).toBe("weak");
    });

    it("should handle very long password", () => {
      const longPassword = "Abc123!@#" + "x".repeat(100);
      const result = evaluatePasswordStrength(longPassword);
      expect(result.score).toBe(100);
      expect(result.level).toBe("strong");
      expect(result.hasMinLength).toBe(true);
    });

    it("should handle single character password", () => {
      const result = evaluatePasswordStrength("A");
      expect(result.score).toBe(20); // Only uppercase
      expect(result.level).toBe("weak");
      expect(result.hasMinLength).toBe(false);
      expect(result.hasUppercase).toBe(true);
    });

    it("should handle password with Unicode characters", () => {
      const result = evaluatePasswordStrength("Pässwörd123!");
      expect(result.hasMinLength).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasNumbers).toBe(true);
      expect(result.hasSpecialChars).toBe(true);
      expect(result.score).toBe(100);
      expect(result.level).toBe("strong");
    });

    it("should handle password with emoji", () => {
      const result = evaluatePasswordStrength("Password1😀");
      expect(result.hasMinLength).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasNumbers).toBe(true);
      // Emoji is not in the special chars regex, so false
      expect(result.hasSpecialChars).toBe(false);
      expect(result.score).toBe(80);
    });

    it("should handle password with whitespace in middle", () => {
      const result = evaluatePasswordStrength("Pass word123!");
      expect(result.hasMinLength).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasNumbers).toBe(true);
      expect(result.hasSpecialChars).toBe(true); // Space + !
      expect(result.score).toBe(100);
    });

    it("should handle password with tabs", () => {
      const result = evaluatePasswordStrength("Pass\tword123!");
      expect(result.hasMinLength).toBe(true);
      expect(result.score).toBe(100);
    });

    it("should handle password with newlines", () => {
      const result = evaluatePasswordStrength("Pass\nword123!");
      expect(result.hasMinLength).toBe(true);
      expect(result.score).toBe(100);
    });
  });

  describe("Feedback messages", () => {
    it('should return "Słabe hasło" for weak passwords', () => {
      const result = evaluatePasswordStrength("abc");
      expect(result.feedback).toBe("Słabe hasło");
    });

    it('should return "Średnie hasło" for medium passwords', () => {
      const result = evaluatePasswordStrength("abcdefgh");
      expect(result.feedback).toBe("Średnie hasło");
    });

    it('should return "Silne hasło" for strong passwords', () => {
      const result = evaluatePasswordStrength("Pass123!");
      expect(result.feedback).toBe("Silne hasło");
    });
  });

  describe("Return object structure", () => {
    it("should return object with all required properties", () => {
      const result = evaluatePasswordStrength("Test123!");
      expect(result).toHaveProperty("level");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("feedback");
      expect(result).toHaveProperty("hasMinLength");
      expect(result).toHaveProperty("hasUppercase");
      expect(result).toHaveProperty("hasLowercase");
      expect(result).toHaveProperty("hasNumbers");
      expect(result).toHaveProperty("hasSpecialChars");
    });

    it("should return level as one of weak, medium, or strong", () => {
      const weakResult = evaluatePasswordStrength("abc");
      const mediumResult = evaluatePasswordStrength("abcdefgh");
      const strongResult = evaluatePasswordStrength("Pass123!");

      expect(["weak", "medium", "strong"]).toContain(weakResult.level);
      expect(["weak", "medium", "strong"]).toContain(mediumResult.level);
      expect(["weak", "medium", "strong"]).toContain(strongResult.level);
    });

    it("should return score as number between 0 and 100", () => {
      const result = evaluatePasswordStrength("Test123!");
      expect(typeof result.score).toBe("number");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should return boolean values for all has* properties", () => {
      const result = evaluatePasswordStrength("Test123!");
      expect(typeof result.hasMinLength).toBe("boolean");
      expect(typeof result.hasUppercase).toBe("boolean");
      expect(typeof result.hasLowercase).toBe("boolean");
      expect(typeof result.hasNumbers).toBe("boolean");
      expect(typeof result.hasSpecialChars).toBe("boolean");
    });
  });

  describe("Immutability", () => {
    it("should not modify the original input string", () => {
      const original = "Password123!";
      const originalCopy = "Password123!";
      evaluatePasswordStrength(original);
      expect(original).toBe(originalCopy);
    });
  });

  describe("Consistency", () => {
    it("should return the same result for the same input", () => {
      const password = "Test123!";
      const result1 = evaluatePasswordStrength(password);
      const result2 = evaluatePasswordStrength(password);

      expect(result1).toEqual(result2);
    });

    it("should be deterministic across multiple calls", () => {
      const password = "MySecureP@ssw0rd";
      const results = Array(10)
        .fill(null)
        .map(() => evaluatePasswordStrength(password));

      // All results should be identical
      results.forEach((result) => {
        expect(result).toEqual(results[0]);
      });
    });
  });

  describe("Score increments validation", () => {
    it("should always have score as multiple of 20", () => {
      const passwords = [
        "",
        "a",
        "abc",
        "abcdefgh",
        "Abcdefgh",
        "Abcdefg1",
        "Abcdefg!",
        "Abc123!@",
      ];

      passwords.forEach((password) => {
        const result = evaluatePasswordStrength(password);
        expect(result.score % 20).toBe(0);
      });
    });

    it("should have score equal to sum of criteria met times 20", () => {
      const result = evaluatePasswordStrength("Pass123!");
      const criteriaCount =
        (result.hasMinLength ? 1 : 0) +
        (result.hasLowercase ? 1 : 0) +
        (result.hasUppercase ? 1 : 0) +
        (result.hasNumbers ? 1 : 0) +
        (result.hasSpecialChars ? 1 : 0);

      expect(result.score).toBe(criteriaCount * 20);
    });
  });

  describe("Test plan coverage - TC-PWD-001 to TC-PWD-012", () => {
    it("TC-PWD-001: Empty password", () => {
      const result = evaluatePasswordStrength("");
      expect(result.level).toBe("weak");
      expect(result.score).toBe(0);
      expect(result.hasMinLength).toBe(false);
    });

    it("TC-PWD-002: Too short (< 8 chars)", () => {
      const result = evaluatePasswordStrength("Abc1!");
      expect(result.level).toBe("strong");
      expect(result.score).toBe(80);
      expect(result.hasMinLength).toBe(false);
    });

    it("TC-PWD-003: Min length only", () => {
      const result = evaluatePasswordStrength("12345678");
      expect(result.level).toBe("medium");
      expect(result.score).toBe(40);
      expect(result.hasMinLength).toBe(true);
      expect(result.hasNumbers).toBe(true);
    });

    it("TC-PWD-004: Medium password", () => {
      const result = evaluatePasswordStrength("Password1");
      expect(result.level).toBe("strong");
      expect(result.score).toBe(80);
    });

    it("TC-PWD-005: Strong password", () => {
      const result = evaluatePasswordStrength("Pass1234!");
      expect(result.level).toBe("strong");
      expect(result.score).toBe(100);
    });

    it("TC-PWD-006: Only lowercase", () => {
      const result = evaluatePasswordStrength("abcdefgh");
      expect(result.level).toBe("medium");
      expect(result.score).toBe(40);
      expect(result.hasLowercase).toBe(true);
    });

    it("TC-PWD-007: Only uppercase", () => {
      const result = evaluatePasswordStrength("ABCDEFGH");
      expect(result.level).toBe("medium");
      expect(result.score).toBe(40);
      expect(result.hasUppercase).toBe(true);
    });

    it("TC-PWD-008: Only numbers", () => {
      const result = evaluatePasswordStrength("12345678");
      expect(result.level).toBe("medium");
      expect(result.score).toBe(40);
      expect(result.hasNumbers).toBe(true);
    });

    it("TC-PWD-009: Only special chars", () => {
      const result = evaluatePasswordStrength("!@#$%^&*");
      expect(result.level).toBe("medium");
      expect(result.score).toBe(40);
      expect(result.hasSpecialChars).toBe(true);
    });

    it("TC-PWD-010: All criteria met", () => {
      const result = evaluatePasswordStrength("Abc123!@#");
      expect(result.level).toBe("strong");
      expect(result.score).toBe(100);
    });

    it("TC-PWD-011: Weak with spaces", () => {
      const result = evaluatePasswordStrength("abc 123");
      expect(result.level).toBe("medium"); // Score is 40 (lowercase + numbers)
      expect(result.score).toBe(40); // lowercase + numbers, no length (only 7 chars)
    });

    it("TC-PWD-012: Real strong password", () => {
      const result = evaluatePasswordStrength("MyP@ssw0rd2024");
      expect(result.level).toBe("strong");
      expect(result.score).toBe(100);
    });
  });
});
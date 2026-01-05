/**
 * Transliterates Polish characters to ASCII equivalents for ltree compatibility.
 *
 * ltree data type in PostgreSQL only supports: a-z, A-Z, 0-9, _
 * This function converts Polish diacritics to their base ASCII characters.
 *
 * @param text - Text containing Polish characters
 * @returns Transliterated text safe for ltree
 *
 * @example
 * transliteratePolish("Garaż") // "Garaz"
 * transliteratePolish("Półka") // "Polka"
 */
export function transliteratePolish(text: string): string {
  const polishMap: Record<string, string> = {
    // Lowercase
    ą: "a",
    ć: "c",
    ę: "e",
    ł: "l",
    ń: "n",
    ó: "o",
    ś: "s",
    ź: "z",
    ż: "z",
    // Uppercase
    Ą: "A",
    Ć: "C",
    Ę: "E",
    Ł: "L",
    Ń: "N",
    Ó: "O",
    Ś: "S",
    Ź: "Z",
    Ż: "Z",
  };

  return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (char) => polishMap[char] || char);
}

/**
 * Sanitizes text for use in ltree path segments.
 * Converts to lowercase, transliterates Polish characters, and replaces spaces/special chars with underscores.
 *
 * @param text - Text to sanitize
 * @returns Sanitized text safe for ltree path
 *
 * @example
 * sanitizeForLtree("Garaż Metalowy") // "garaz_metalowy"
 * sanitizeForLtree("Półka #1") // "polka_1"
 */
export function sanitizeForLtree(text: string): string {
  // Step 1: Transliterate Polish characters
  let sanitized = transliteratePolish(text);

  // Step 2: Convert to lowercase
  sanitized = sanitized.toLowerCase();

  // Step 3: Replace spaces and special characters with underscores
  sanitized = sanitized.replace(/[^a-z0-9_]/g, "_");

  // Step 4: Remove consecutive underscores
  sanitized = sanitized.replace(/_+/g, "_");

  // Step 5: Trim underscores from start and end
  sanitized = sanitized.replace(/^_+|_+$/g, "");

  return sanitized;
}

/**
 * Unit Tests: transliterate.ts
 *
 * Tests for Polish character transliteration and ltree path sanitization.
 * Business Rules:
 * - PostgreSQL ltree only supports: a-z, A-Z, 0-9, _
 * - Polish diacritics must be converted to ASCII equivalents
 * - Spaces and special characters become underscores
 * - No consecutive underscores allowed
 * - No leading/trailing underscores
 */

import { describe, it, expect } from 'vitest';
import { transliteratePolish, sanitizeForLtree } from '@/lib/utils/transliterate';

describe('transliteratePolish', () => {
  describe('Polish lowercase characters', () => {
    it('should convert all Polish lowercase diacritics to ASCII', () => {
      const input = 'ąćęłńóśźż';
      const result = transliteratePolish(input);
      expect(result).toBe('acelnoszz');
    });

    it('should convert ą to a', () => {
      expect(transliteratePolish('ą')).toBe('a');
      expect(transliteratePolish('mąka')).toBe('maka');
    });

    it('should convert ć to c', () => {
      expect(transliteratePolish('ć')).toBe('c');
      expect(transliteratePolish('ćma')).toBe('cma');
    });

    it('should convert ę to e', () => {
      expect(transliteratePolish('ę')).toBe('e');
      expect(transliteratePolish('węże')).toBe('weze');
    });

    it('should convert ł to l', () => {
      expect(transliteratePolish('ł')).toBe('l');
      expect(transliteratePolish('łódka')).toBe('lodka');
    });

    it('should convert ń to n', () => {
      expect(transliteratePolish('ń')).toBe('n');
      expect(transliteratePolish('koń')).toBe('kon');
    });

    it('should convert ó to o', () => {
      expect(transliteratePolish('ó')).toBe('o');
      expect(transliteratePolish('góra')).toBe('gora');
    });

    it('should convert ś to s', () => {
      expect(transliteratePolish('ś')).toBe('s');
      expect(transliteratePolish('śnieg')).toBe('snieg');
    });

    it('should convert ź to z', () => {
      expect(transliteratePolish('ź')).toBe('z');
      expect(transliteratePolish('źdźbło')).toBe('zdzblo');
    });

    it('should convert ż to z', () => {
      expect(transliteratePolish('ż')).toBe('z');
      expect(transliteratePolish('żaba')).toBe('zaba');
    });
  });

  describe('Polish uppercase characters', () => {
    it('should convert all Polish uppercase diacritics to ASCII', () => {
      const input = 'ĄĆĘŁŃÓŚŹŻ';
      const result = transliteratePolish(input);
      expect(result).toBe('ACELNOSZZ');
    });

    it('should convert Ą to A', () => {
      expect(transliteratePolish('Ą')).toBe('A');
      expect(transliteratePolish('MĄKA')).toBe('MAKA');
    });

    it('should convert Ć to C', () => {
      expect(transliteratePolish('Ć')).toBe('C');
      expect(transliteratePolish('ĆMA')).toBe('CMA');
    });

    it('should convert Ę to E', () => {
      expect(transliteratePolish('Ę')).toBe('E');
      expect(transliteratePolish('WĘŻE')).toBe('WEZE');
    });

    it('should convert Ł to L', () => {
      expect(transliteratePolish('Ł')).toBe('L');
      expect(transliteratePolish('ŁÓDKA')).toBe('LODKA');
    });

    it('should convert Ń to N', () => {
      expect(transliteratePolish('Ń')).toBe('N');
      expect(transliteratePolish('KOŃ')).toBe('KON');
    });

    it('should convert Ó to O', () => {
      expect(transliteratePolish('Ó')).toBe('O');
      expect(transliteratePolish('GÓRA')).toBe('GORA');
    });

    it('should convert Ś to S', () => {
      expect(transliteratePolish('Ś')).toBe('S');
      expect(transliteratePolish('ŚNIEG')).toBe('SNIEG');
    });

    it('should convert Ź to Z', () => {
      expect(transliteratePolish('Ź')).toBe('Z');
      expect(transliteratePolish('ŹDŹBŁO')).toBe('ZDZBLO');
    });

    it('should convert Ż to Z', () => {
      expect(transliteratePolish('Ż')).toBe('Z');
      expect(transliteratePolish('ŻABA')).toBe('ZABA');
    });
  });

  describe('Mixed case handling', () => {
    it('should handle mixed case Polish text', () => {
      expect(transliteratePolish('Łódź')).toBe('Lodz');
      expect(transliteratePolish('Kraków')).toBe('Krakow');
      expect(transliteratePolish('Gdańsk')).toBe('Gdansk');
    });

    it('should preserve case for non-Polish characters', () => {
      expect(transliteratePolish('HeLLo')).toBe('HeLLo');
      expect(transliteratePolish('TeSt123')).toBe('TeSt123');
    });
  });

  describe('Real-world examples', () => {
    it('should transliterate common location names', () => {
      expect(transliteratePolish('Garaż')).toBe('Garaz');
      expect(transliteratePolish('Półka')).toBe('Polka');
      expect(transliteratePolish('Piętro')).toBe('Pietro');
      expect(transliteratePolish('Łazienka')).toBe('Lazienka');
    });

    it('should transliterate box descriptions', () => {
      expect(transliteratePolish('Książki i zeszyty')).toBe('Ksiazki i zeszyty');
      expect(transliteratePolish('Narzędzia')).toBe('Narzedzia');
      expect(transliteratePolish('Świąteczne ozdoby')).toBe('Swiateczne ozdoby');
    });

    it('should handle text with no Polish characters', () => {
      expect(transliteratePolish('Garage')).toBe('Garage');
      expect(transliteratePolish('Shelf 123')).toBe('Shelf 123');
      expect(transliteratePolish('Tools & Equipment')).toBe('Tools & Equipment');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(transliteratePolish('')).toBe('');
    });

    it('should handle string with only spaces', () => {
      expect(transliteratePolish('   ')).toBe('   ');
    });

    it('should handle string with only Polish characters', () => {
      expect(transliteratePolish('ąćęłńóśźż')).toBe('acelnoszz');
      expect(transliteratePolish('ĄĆĘŁŃÓŚŹŻ')).toBe('ACELNOSZZ');
    });

    it('should handle numbers and special characters unchanged', () => {
      expect(transliteratePolish('123-456')).toBe('123-456');
      expect(transliteratePolish('!@#$%^&*()')).toBe('!@#$%^&*()');
    });

    it('should handle Unicode characters outside Polish diacritics', () => {
      expect(transliteratePolish('Café')).toBe('Café');
      expect(transliteratePolish('Niño')).toBe('Niño');
    });

    it('should handle very long strings', () => {
      const longText = 'ą'.repeat(1000);
      const result = transliteratePolish(longText);
      expect(result).toBe('a'.repeat(1000));
      expect(result.length).toBe(1000);
    });

    it('should handle mixed Polish and non-Polish text', () => {
      expect(transliteratePolish('Półka A-123 (górna)')).toBe('Polka A-123 (gorna)');
      expect(transliteratePolish('Garaż Metalowy #5')).toBe('Garaz Metalowy #5');
    });
  });

  describe('Immutability', () => {
    it('should not modify the original string', () => {
      const original = 'Łódź';
      const originalCopy = 'Łódź';
      transliteratePolish(original);
      expect(original).toBe(originalCopy);
    });
  });
});

describe('sanitizeForLtree', () => {
  describe('Basic sanitization', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeForLtree('GARAŻ')).toBe('garaz');
      expect(sanitizeForLtree('MixedCase')).toBe('mixedcase');
    });

    it('should transliterate Polish characters', () => {
      expect(sanitizeForLtree('Półka')).toBe('polka');
      expect(sanitizeForLtree('Łazienka')).toBe('lazienka');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeForLtree('Garaż Metalowy')).toBe('garaz_metalowy');
      expect(sanitizeForLtree('Top Shelf')).toBe('top_shelf');
    });

    it('should replace special characters with underscores', () => {
      expect(sanitizeForLtree('Półka #1')).toBe('polka_1');
      expect(sanitizeForLtree('Box-A-123')).toBe('box_a_123');
      expect(sanitizeForLtree('Shelf (Top)')).toBe('shelf_top');
    });
  });

  describe('Underscore normalization', () => {
    it('should remove consecutive underscores', () => {
      expect(sanitizeForLtree('Box   Area')).toBe('box_area');
      expect(sanitizeForLtree('Top---Shelf')).toBe('top_shelf');
      expect(sanitizeForLtree('A!!!B')).toBe('a_b');
    });

    it('should remove leading underscores', () => {
      expect(sanitizeForLtree('___Garage')).toBe('garage');
      expect(sanitizeForLtree('   Półka')).toBe('polka');
      expect(sanitizeForLtree('---Box')).toBe('box');
    });

    it('should remove trailing underscores', () => {
      expect(sanitizeForLtree('Garage___')).toBe('garage');
      expect(sanitizeForLtree('Półka   ')).toBe('polka');
      expect(sanitizeForLtree('Box---')).toBe('box');
    });

    it('should remove both leading and trailing underscores', () => {
      expect(sanitizeForLtree('___Box___')).toBe('box');
      expect(sanitizeForLtree('   Garaż   ')).toBe('garaz');
      expect(sanitizeForLtree('---Półka---')).toBe('polka');
    });
  });

  describe('ltree compatibility', () => {
    it('should produce ltree-safe output (only a-z, 0-9, _)', () => {
      const result = sanitizeForLtree('Garaż Metalowy #5 (Górna Półka)!!!');
      expect(result).toMatch(/^[a-z0-9_]*$/);
      expect(result).toBe('garaz_metalowy_5_gorna_polka');
    });

    it('should handle alphanumeric characters', () => {
      expect(sanitizeForLtree('Box123')).toBe('box123');
      expect(sanitizeForLtree('Shelf A1')).toBe('shelf_a1');
      expect(sanitizeForLtree('Level5Floor2')).toBe('level5floor2');
    });

    it('should only output lowercase letters', () => {
      const result = sanitizeForLtree('UPPERCASE MixedCase lowercase');
      expect(result).toBe('uppercase_mixedcase_lowercase');
      expect(result).not.toMatch(/[A-Z]/);
    });
  });

  describe('Real-world location paths', () => {
    it('should sanitize garage location', () => {
      expect(sanitizeForLtree('Garaż Metalowy')).toBe('garaz_metalowy');
    });

    it('should sanitize shelf names', () => {
      expect(sanitizeForLtree('Półka Górna')).toBe('polka_gorna');
      expect(sanitizeForLtree('Półka Dolna')).toBe('polka_dolna');
    });

    it('should sanitize complex location names', () => {
      expect(sanitizeForLtree('Regał #3 - Sekcja A (Lewa)')).toBe('regal_3_sekcja_a_lewa');
      expect(sanitizeForLtree('Piętro 2, Pokój 5, Szafa')).toBe('pietro_2_pokoj_5_szafa');
    });

    it('should handle numeric identifiers', () => {
      expect(sanitizeForLtree('Garaż #1')).toBe('garaz_1');
      expect(sanitizeForLtree('Poziom 5, Rząd 3')).toBe('poziom_5_rzad_3');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeForLtree('')).toBe('');
    });

    it('should handle string with only spaces', () => {
      expect(sanitizeForLtree('   ')).toBe('');
    });

    it('should handle string with only special characters', () => {
      expect(sanitizeForLtree('!!!')).toBe('');
      expect(sanitizeForLtree('---')).toBe('');
      expect(sanitizeForLtree('###')).toBe('');
    });

    it('should handle string with only underscores', () => {
      expect(sanitizeForLtree('___')).toBe('');
    });

    it('should handle very long strings', () => {
      const longName = 'Garaż '.repeat(100);
      const result = sanitizeForLtree(longName);
      expect(result).toMatch(/^[a-z0-9_]*$/);
      // Should have "garaz" repeated with underscores normalized
      expect(result).toContain('garaz');
      expect(result).not.toMatch(/__/); // No consecutive underscores
    });

    it('should handle single character', () => {
      expect(sanitizeForLtree('A')).toBe('a');
      expect(sanitizeForLtree('ą')).toBe('a');
      expect(sanitizeForLtree('5')).toBe('5');
    });

    it('should handle all Polish diacritics in sentence', () => {
      const result = sanitizeForLtree('Zażółć gęślą jaźń');
      expect(result).toBe('zazolc_gesla_jazn');
      expect(result).toMatch(/^[a-z0-9_]*$/);
    });
  });

  describe('Comprehensive sanitization flow', () => {
    it('should apply all transformations in correct order', () => {
      // Input: Polish chars + uppercase + spaces + special chars
      const input = 'Półka #3 (GÓRNA)';
      const result = sanitizeForLtree(input);

      // Step verification:
      // 1. Transliterate: "Polka #3 (GORNA)"
      // 2. Lowercase: "polka #3 (gorna)"
      // 3. Replace special: "polka_3__gorna_"
      // 4. Remove consecutive: "polka_3_gorna_"
      // 5. Trim: "polka_3_gorna"
      expect(result).toBe('polka_3_gorna');
    });

    it('should handle complex real-world example', () => {
      const input = 'Magazyn "Stary" - Półka #5 (Część Środkowa) !!!';
      const result = sanitizeForLtree(input);
      expect(result).toBe('magazyn_stary_polka_5_czesc_srodkowa');
      expect(result).toMatch(/^[a-z0-9_]*$/);
    });
  });

  describe('Immutability', () => {
    it('should not modify the original string', () => {
      const original = 'Półka Górna';
      const originalCopy = 'Półka Górna';
      sanitizeForLtree(original);
      expect(original).toBe(originalCopy);
    });
  });

  describe('Idempotency', () => {
    it('should be idempotent for already sanitized strings', () => {
      const sanitized = 'garaz_metalowy';
      expect(sanitizeForLtree(sanitized)).toBe(sanitized);
    });

    it('should be idempotent when applied multiple times', () => {
      const input = 'Półka Górna';
      const firstPass = sanitizeForLtree(input);
      const secondPass = sanitizeForLtree(firstPass);
      const thirdPass = sanitizeForLtree(secondPass);
      expect(firstPass).toBe(secondPass);
      expect(secondPass).toBe(thirdPass);
    });
  });

  describe('Database integration scenarios', () => {
    it('should create valid ltree paths', () => {
      const locations = [
        'Garaż',
        'Metal Rack',
        'Top Shelf',
        'Left Section',
        'Box Area'
      ];

      const sanitized = locations.map(sanitizeForLtree);
      const ltreePath = sanitized.join('.');

      expect(ltreePath).toBe('garaz.metal_rack.top_shelf.left_section.box_area');
      expect(ltreePath).toMatch(/^[a-z0-9_.]*$/);
    });

    it('should handle Polish location hierarchy', () => {
      const locations = [
        'Magazyn',
        'Regał Metalowy',
        'Półka Górna',
        'Sekcja Prawa'
      ];

      const sanitized = locations.map(sanitizeForLtree);
      const ltreePath = sanitized.join('.');

      expect(ltreePath).toBe('magazyn.regal_metalowy.polka_gorna.sekcja_prawa');
      expect(ltreePath).toMatch(/^[a-z0-9_.]*$/);
    });

    it('should prevent ltree injection', () => {
      // Try to inject dots or asterisks that have special meaning in ltree
      expect(sanitizeForLtree('Parent.Child')).toBe('parent_child');
      expect(sanitizeForLtree('Parent*')).toBe('parent');
      expect(sanitizeForLtree('Parent@')).toBe('parent');
    });
  });
});
import { describe, it, expect } from 'vitest';
import {
  ensureString,
  ensureNumber,
  safeAccess,
  isNonEmptyString,
  isValidNumber,
  hasRequiredProperties,
  safeStringCompare,
  clampNumber
} from '../../../src/utils/validators.js';

describe('Validators', () => {
  describe('ensureString', () => {
    it('should return string value as-is', () => {
      expect(ensureString('hello', 'default')).toBe('hello');
    });

    it('should return default for null', () => {
      expect(ensureString(null, 'default')).toBe('default');
    });

    it('should return default for undefined', () => {
      expect(ensureString(undefined, 'default')).toBe('default');
    });

    it('should convert number to string', () => {
      expect(ensureString(123, 'default')).toBe('123');
    });

    it('should convert boolean to string', () => {
      expect(ensureString(true, 'default')).toBe('true');
      expect(ensureString(false, 'default')).toBe('false');
    });

    it('should convert object to string', () => {
      expect(ensureString({ key: 'value' }, 'default')).toBe('[object Object]');
    });

    it('should convert array to string', () => {
      expect(ensureString([1, 2, 3], 'default')).toBe('1,2,3');
    });

    it('should handle empty string', () => {
      expect(ensureString('', 'default')).toBe('');
    });
  });

  describe('ensureNumber', () => {
    it('should return valid number as-is', () => {
      expect(ensureNumber(42, 0)).toBe(42);
    });

    it('should return default for null', () => {
      expect(ensureNumber(null, 100)).toBe(0);
    });

    it('should return default for undefined', () => {
      expect(ensureNumber(undefined, 100)).toBe(100);
    });

    it('should convert string number to number', () => {
      expect(ensureNumber('123', 0)).toBe(123);
      expect(ensureNumber('123.45', 0)).toBe(123.45);
    });

    it('should return default for invalid string', () => {
      expect(ensureNumber('abc', 100)).toBe(100);
    });

    it('should return default for NaN', () => {
      expect(ensureNumber(NaN, 100)).toBe(100);
    });

    it('should handle zero', () => {
      expect(ensureNumber(0, 100)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(ensureNumber(-42, 0)).toBe(-42);
    });

    it('should handle Infinity', () => {
      expect(ensureNumber(Infinity, 100)).toBe(Infinity);
    });

    it('should convert boolean to number', () => {
      expect(ensureNumber(true, 0)).toBe(1);
      expect(ensureNumber(false, 0)).toBe(0);
    });
  });

  describe('safeAccess', () => {
    it('should access nested property safely', () => {
      const obj = { user: { name: 'John', age: 30 } };
      expect(safeAccess(obj, o => o.user.name, 'Unknown')).toBe('John');
    });

    it('should return default for null object', () => {
      expect(safeAccess(null, o => o.user.name, 'Unknown')).toBe('Unknown');
    });

    it('should return default for undefined object', () => {
      expect(safeAccess(undefined, o => o.user.name, 'Unknown')).toBe('Unknown');
    });

    it('should return default when accessor throws', () => {
      const obj = { user: null };
      expect(safeAccess(obj, o => o.user.name, 'Unknown')).toBe('Unknown');
    });

    it('should handle deep nested access', () => {
      const obj = { a: { b: { c: { d: 'deep' } } } };
      expect(safeAccess(obj, o => o.a.b.c.d, 'default')).toBe('deep');
    });

    it('should handle array access', () => {
      const obj = { items: [{ name: 'first' }, { name: 'second' }] };
      expect(safeAccess(obj, o => o.items[1].name, 'default')).toBe('second');
    });

    it('should return default for out of bounds array access', () => {
      const obj = { items: [{ name: 'first' }] };
      expect(safeAccess(obj, o => o.items[5].name, 'default')).toBe('default');
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty string', () => {
      expect(isNonEmptyString('hello')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isNonEmptyString(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNonEmptyString(undefined)).toBe(false);
    });

    it('should return false for number', () => {
      expect(isNonEmptyString(123)).toBe(false);
    });

    it('should return false for boolean', () => {
      expect(isNonEmptyString(true)).toBe(false);
    });

    it('should return false for object', () => {
      expect(isNonEmptyString({})).toBe(false);
    });

    it('should return true for string with content after trim', () => {
      expect(isNonEmptyString('  hello  ')).toBe(true);
    });
  });

  describe('isValidNumber', () => {
    it('should return true for valid positive number', () => {
      expect(isValidNumber(42)).toBe(true);
    });

    it('should return true for valid negative number', () => {
      expect(isValidNumber(-42)).toBe(true);
    });

    it('should return true for zero', () => {
      expect(isValidNumber(0)).toBe(true);
    });

    it('should return true for decimal number', () => {
      expect(isValidNumber(3.14)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isValidNumber(NaN)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(isValidNumber(Infinity)).toBe(false);
    });

    it('should return false for -Infinity', () => {
      expect(isValidNumber(-Infinity)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isValidNumber('123')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidNumber(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidNumber(undefined)).toBe(false);
    });

    it('should return false for boolean', () => {
      expect(isValidNumber(true)).toBe(false);
    });
  });

  describe('hasRequiredProperties', () => {
    it('should return true when all required properties exist', () => {
      const obj = { name: 'John', age: 30, email: 'john@example.com' };
      expect(hasRequiredProperties(obj, ['name', 'age'])).toBe(true);
    });

    it('should return false when required property is missing', () => {
      const obj = { name: 'John' };
      expect(hasRequiredProperties(obj, ['name', 'age'])).toBe(false);
    });

    it('should return false when required property is undefined', () => {
      const obj = { name: 'John', age: undefined };
      expect(hasRequiredProperties(obj, ['name', 'age'])).toBe(false);
    });

    it('should return true when required property is null', () => {
      const obj = { name: 'John', age: null };
      expect(hasRequiredProperties(obj, ['name', 'age'])).toBe(true);
    });

    it('should return true when required property is false', () => {
      const obj = { name: 'John', active: false };
      expect(hasRequiredProperties(obj, ['name', 'active'])).toBe(true);
    });

    it('should return true when required property is 0', () => {
      const obj = { name: 'John', count: 0 };
      expect(hasRequiredProperties(obj, ['name', 'count'])).toBe(true);
    });

    it('should return true when required property is empty string', () => {
      const obj = { name: 'John', description: '' };
      expect(hasRequiredProperties(obj, ['name', 'description'])).toBe(true);
    });

    it('should return false for null object', () => {
      expect(hasRequiredProperties(null, ['name'])).toBe(false);
    });

    it('should return false for undefined object', () => {
      expect(hasRequiredProperties(undefined, ['name'])).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(hasRequiredProperties('string', ['length'])).toBe(false);
    });

    it('should return true for empty required properties array', () => {
      const obj = { name: 'John' };
      expect(hasRequiredProperties(obj, [])).toBe(true);
    });
  });

  describe('safeStringCompare', () => {
    it('should compare strings case-sensitively by default', () => {
      expect(safeStringCompare('Hello', 'Hello')).toBe(true);
      expect(safeStringCompare('Hello', 'hello')).toBe(true); // Default is case-insensitive
    });

    it('should compare strings case-insensitively when specified', () => {
      expect(safeStringCompare('Hello', 'hello', false)).toBe(true);
      expect(safeStringCompare('HELLO', 'hello', false)).toBe(true);
    });

    it('should compare strings case-sensitively when specified', () => {
      expect(safeStringCompare('Hello', 'hello', true)).toBe(false);
      expect(safeStringCompare('Hello', 'Hello', true)).toBe(true);
    });

    it('should convert non-strings to strings before comparison', () => {
      expect(safeStringCompare(123, '123')).toBe(true);
      expect(safeStringCompare(true, 'true')).toBe(true);
      expect(safeStringCompare(null, '')).toBe(true);
    });

    it('should handle null and undefined', () => {
      expect(safeStringCompare(null, undefined)).toBe(true);
      expect(safeStringCompare(null, '')).toBe(true);
      expect(safeStringCompare(undefined, '')).toBe(true);
    });

    it('should handle mixed case with case-insensitive comparison', () => {
      expect(safeStringCompare('HeLLo WoRLd', 'hello world', false)).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(safeStringCompare('', '')).toBe(true);
      expect(safeStringCompare('', ' ')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(safeStringCompare('  hello  ', '  hello  ')).toBe(true);
      expect(safeStringCompare('hello', ' hello ')).toBe(false);
    });
  });

  describe('clampNumber', () => {
    it('should return value when within range', () => {
      expect(clampNumber(5, 1, 10)).toBe(5);
    });

    it('should return min when value is below range', () => {
      expect(clampNumber(-5, 1, 10)).toBe(1);
    });

    it('should return max when value is above range', () => {
      expect(clampNumber(15, 1, 10)).toBe(10);
    });

    it('should return min when value equals min', () => {
      expect(clampNumber(1, 1, 10)).toBe(1);
    });

    it('should return max when value equals max', () => {
      expect(clampNumber(10, 1, 10)).toBe(10);
    });

    it('should handle negative ranges', () => {
      expect(clampNumber(-5, -10, -1)).toBe(-5);
      expect(clampNumber(-15, -10, -1)).toBe(-10);
      expect(clampNumber(5, -10, -1)).toBe(-1);
    });

    it('should handle decimal numbers', () => {
      expect(clampNumber(2.5, 1.0, 3.0)).toBe(2.5);
      expect(clampNumber(0.5, 1.0, 3.0)).toBe(1.0);
      expect(clampNumber(3.5, 1.0, 3.0)).toBe(3.0);
    });

    it('should handle zero values', () => {
      expect(clampNumber(0, -5, 5)).toBe(0);
      expect(clampNumber(0, 1, 5)).toBe(1);
      expect(clampNumber(0, -5, -1)).toBe(-1);
    });

    it('should handle same min and max', () => {
      expect(clampNumber(5, 3, 3)).toBe(3);
      expect(clampNumber(1, 3, 3)).toBe(3);
    });
  });
});
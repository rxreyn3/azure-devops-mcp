/**
 * Utility functions for safe property access and validation
 */

/**
 * Safely converts a value to string with a default fallback
 */
export function ensureString(value: unknown, defaultValue: string): string {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value);
}

/**
 * Safely converts a value to number with validation
 */
export function ensureNumber(value: unknown, defaultValue: number): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely access nested properties with a default value
 */
export function safeAccess<T, R>(
  obj: T | null | undefined,
  accessor: (obj: T) => R,
  defaultValue: R
): R {
  try {
    return obj ? accessor(obj) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Type guard to check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard to check if a value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Validates that an object has all required properties
 */
export function hasRequiredProperties<T extends object>(
  obj: unknown,
  requiredProps: (keyof T)[]
): obj is T {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  const record = obj as Record<string, unknown>;
  return requiredProps.every(prop => 
    prop in record && record[String(prop)] !== undefined
  );
}

/**
 * Safely compare strings with case insensitivity
 */
export function safeStringCompare(
  str1: unknown,
  str2: unknown,
  caseSensitive = false
): boolean {
  const s1 = ensureString(str1, '');
  const s2 = ensureString(str2, '');
  
  if (caseSensitive) {
    return s1 === s2;
  }
  
  return s1.toLowerCase() === s2.toLowerCase();
}

/**
 * Validates and ensures a value is within a numeric range
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
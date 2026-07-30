import { customAlphabet } from 'nanoid';

// Exclude visually ambiguous characters: 0, O, I, l, 1
const SAFE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz';

/**
 * Generate an unguessable party code (8 characters by default).
 * Uses a custom alphabet excluding visually ambiguous characters.
 */
export function generatePartyCode(length: number = 8): string {
  const generate = customAlphabet(SAFE_ALPHABET, length);
  return generate();
}

/**
 * Generate a location code (6 characters by default).
 * Uses the same safe alphabet as party codes.
 */
export function generateLocationCode(length: number = 6): string {
  const generate = customAlphabet(SAFE_ALPHABET, length);
  return generate();
}

import { customAlphabet } from 'nanoid';

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const ID_LENGTH = 25;

const generate = customAlphabet(ID_ALPHABET, ID_LENGTH);

/**
 * Generate a unique ID suitable for use as a primary key.
 * Uses a 25-character alphanumeric string (similar length to cuid).
 */
export function generateId(): string {
  return generate();
}

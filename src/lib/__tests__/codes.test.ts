import { generatePartyCode, generateLocationCode } from '../codes';

const AMBIGUOUS_CHARS = ['0', 'O', 'I', 'l', '1'];

describe('generatePartyCode', () => {
  it('generates a code with default length of 8', () => {
    const code = generatePartyCode();
    expect(code).toHaveLength(8);
  });

  it('generates a code with custom length', () => {
    const code = generatePartyCode(12);
    expect(code).toHaveLength(12);
  });

  it('does not contain ambiguous characters (0, O, I, l, 1)', () => {
    // Generate many codes to increase confidence
    for (let i = 0; i < 100; i++) {
      const code = generatePartyCode();
      for (const char of AMBIGUOUS_CHARS) {
        expect(code).not.toContain(char);
      }
    }
  });

  it('generates unique codes over 1000 generations', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generatePartyCode());
    }
    expect(codes.size).toBe(1000);
  });
});

describe('generateLocationCode', () => {
  it('generates a code with default length of 6', () => {
    const code = generateLocationCode();
    expect(code).toHaveLength(6);
  });

  it('generates a code with custom length', () => {
    const code = generateLocationCode(10);
    expect(code).toHaveLength(10);
  });

  it('does not contain ambiguous characters (0, O, I, l, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateLocationCode();
      for (const char of AMBIGUOUS_CHARS) {
        expect(code).not.toContain(char);
      }
    }
  });

  it('generates unique codes over 1000 generations', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateLocationCode());
    }
    expect(codes.size).toBe(1000);
  });
});

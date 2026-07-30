import { validateStatusTransition, validateRequestCategory, validateDeliveryTarget } from '../validation';

describe('validateStatusTransition', () => {
  it('allows NEW -> SEEN', () => {
    const result = validateStatusTransition('NEW', 'SEEN');
    expect(result).toEqual({ valid: true });
  });

  it('allows NEW -> DONE', () => {
    const result = validateStatusTransition('NEW', 'DONE');
    expect(result).toEqual({ valid: true });
  });

  it('allows SEEN -> DONE', () => {
    const result = validateStatusTransition('SEEN', 'DONE');
    expect(result).toEqual({ valid: true });
  });

  it('rejects DONE -> NEW', () => {
    const result = validateStatusTransition('DONE', 'NEW');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Cannot transition');
    }
  });

  it('rejects DONE -> SEEN', () => {
    const result = validateStatusTransition('DONE', 'SEEN');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Cannot transition');
    }
  });

  it('rejects SEEN -> NEW', () => {
    const result = validateStatusTransition('SEEN', 'NEW');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Cannot transition');
    }
  });

  it('rejects invalid status value', () => {
    const result = validateStatusTransition('NEW', 'INVALID');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Invalid status');
    }
  });

  it('rejects missing new status', () => {
    const result = validateStatusTransition('NEW', undefined);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('required');
    }
  });
});

describe('validateRequestCategory', () => {
  it('accepts DRINK', () => {
    expect(validateRequestCategory('DRINK')).toEqual({ valid: true });
  });

  it('accepts SUPPLY', () => {
    expect(validateRequestCategory('SUPPLY')).toEqual({ valid: true });
  });

  it('accepts SONG', () => {
    expect(validateRequestCategory('SONG')).toEqual({ valid: true });
  });

  it('accepts OTHER', () => {
    expect(validateRequestCategory('OTHER')).toEqual({ valid: true });
  });

  it('rejects invalid category', () => {
    const result = validateRequestCategory('FOOD');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Invalid category');
    }
  });

  it('rejects empty category', () => {
    const result = validateRequestCategory('');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('required');
    }
  });

  it('rejects null category', () => {
    const result = validateRequestCategory(null);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('required');
    }
  });
});

describe('validateDeliveryTarget', () => {
  it('accepts valid LOCATION delivery', () => {
    const result = validateDeliveryTarget('LOCATION', 'Kitchen');
    expect(result).toEqual({ valid: true });
  });

  it('accepts valid NAME delivery', () => {
    const result = validateDeliveryTarget('NAME', 'John');
    expect(result).toEqual({ valid: true });
  });

  it('rejects missing delivery type', () => {
    const result = validateDeliveryTarget(undefined, 'Kitchen');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Delivery type is required');
    }
  });

  it('rejects invalid delivery type', () => {
    const result = validateDeliveryTarget('EMAIL', 'test@test.com');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Invalid delivery type');
    }
  });

  it('rejects missing delivery value', () => {
    const result = validateDeliveryTarget('LOCATION', '');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Delivery value is required');
    }
  });

  it('rejects null delivery value', () => {
    const result = validateDeliveryTarget('LOCATION', null);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Delivery value is required');
    }
  });
});

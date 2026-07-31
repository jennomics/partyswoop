export type RequestStatus = 'NEW' | 'SEEN' | 'DONE';

export type ValidationResult = { valid: true } | { valid: false; error: string };

const VALID_CATEGORIES = ['DRINK', 'SUPPLY', 'SONG', 'OTHER'] as const;
const VALID_DELIVERY_TYPES = ['LOCATION', 'NAME'] as const;

/**
 * Validate that a request category is one of the allowed values.
 */
export function validateRequestCategory(category: unknown): ValidationResult {
  if (!category) {
    return { valid: false, error: 'Category is required. Must be one of: DRINK, SUPPLY, SONG, OTHER.' };
  }
  if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    return { valid: false, error: `Invalid category "${category}". Must be one of: DRINK, SUPPLY, SONG, OTHER.` };
  }
  return { valid: true };
}

/**
 * Validate that a status transition is allowed.
 * Only forward transitions are allowed: NEW->SEEN, NEW->DONE, SEEN->DONE.
 */
export function validateStatusTransition(
  currentStatus: RequestStatus,
  newStatus: unknown
): ValidationResult {
  if (!newStatus) {
    return { valid: false, error: 'New status is required.' };
  }

  const validStatuses = ['NEW', 'SEEN', 'DONE'];
  if (!validStatuses.includes(newStatus as string)) {
    return { valid: false, error: `Invalid status "${newStatus}". Must be one of: NEW, SEEN, DONE.` };
  }

  const allowed: Record<string, string[]> = {
    NEW: ['SEEN', 'DONE'],
    SEEN: ['DONE'],
    DONE: [],
  };

  const allowedTransitions = allowed[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus as string)) {
    return {
      valid: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${currentStatus} -> ${allowedTransitions.join(' or ') || 'none (already done)'}.`,
    };
  }

  return { valid: true };
}

/**
 * Validate delivery target for drink requests.
 */
export function validateDeliveryTarget(
  deliveryType: unknown,
  deliveryValue: unknown
): ValidationResult {
  if (!deliveryType) {
    return { valid: false, error: 'Delivery type is required for drink requests. Must be LOCATION or NAME.' };
  }
  if (!VALID_DELIVERY_TYPES.includes(deliveryType as typeof VALID_DELIVERY_TYPES[number])) {
    return { valid: false, error: `Invalid delivery type "${deliveryType}". Must be LOCATION or NAME.` };
  }
  if (!deliveryValue || (typeof deliveryValue === 'string' && deliveryValue.trim() === '')) {
    return { valid: false, error: 'Delivery value is required. Provide a location or name for delivery.' };
  }
  return { valid: true };
}

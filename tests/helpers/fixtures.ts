import { parties, menuItems, locations, requests } from '@/lib/schema';
import { generateId } from '@/lib/id';
import { generatePartyCode } from '@/lib/codes';
import type { TestDatabase } from './db';

export interface TestPartyOptions {
  name?: string;
  expiresAt?: string;
}

export interface TestParty {
  id: string;
  name: string;
  guestCode: string;
  hostCode: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Creates a party in the test database with optional menu items.
 */
export async function createTestParty(
  db: TestDatabase,
  options: TestPartyOptions = {}
): Promise<TestParty> {
  const now = new Date().toISOString();
  const party = {
    id: generateId(),
    name: options.name || 'Test Party',
    guestCode: generatePartyCode(8),
    hostCode: generatePartyCode(8),
    createdAt: now,
    expiresAt: options.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  await db.insert(parties).values(party);
  return party;
}

/**
 * Adds a menu item (drink or supply) to a party.
 */
export async function addMenuItem(
  db: TestDatabase,
  partyId: string,
  opts: {
    name: string;
    category: string;
    available?: boolean;
    quantity?: number | null;
  }
) {
  const item = {
    id: generateId(),
    partyId,
    name: opts.name,
    category: opts.category,
    available: opts.available ?? true,
    quantity: opts.quantity ?? null,
    createdAt: new Date().toISOString(),
  };
  const [inserted] = await db.insert(menuItems).values(item).returning();
  return inserted;
}

/**
 * Adds a location to a party.
 */
export async function addLocation(
  db: TestDatabase,
  partyId: string,
  name: string
) {
  const loc = {
    id: generateId(),
    partyId,
    name,
    code: generatePartyCode(6),
  };
  const [inserted] = await db.insert(locations).values(loc).returning();
  return inserted;
}

/**
 * Creates a request in the test database.
 */
export async function createTestRequest(
  db: TestDatabase,
  partyId: string,
  opts: {
    category: string;
    item: string;
    status?: string;
    menuItemId?: string | null;
    deliveryType?: string;
    deliveryValue?: string;
  }
) {
  const req = {
    id: generateId(),
    partyId,
    category: opts.category,
    item: opts.item,
    status: opts.status || 'NEW',
    menuItemId: opts.menuItemId || null,
    deliveryType: opts.deliveryType || 'NAME',
    deliveryValue: opts.deliveryValue || 'Test User',
    createdAt: new Date().toISOString(),
  };
  const [inserted] = await db.insert(requests).values(req).returning();
  return inserted;
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, menuItems } from '@/lib/schema';
import { generateId } from '@/lib/id';
import { generatePartyCode } from '@/lib/codes';

const DEFAULT_SUPPLIES = [
  'Toilet Paper',
  'Sunscreen',
  'Bug Spray',
  'Ice',
  'Cups',
  'Napkins',
  'Paper Towels',
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, any>;
    const name = body.name?.trim() || 'My Party';

    const guestCode = generatePartyCode(8);
    const hostCode = generatePartyCode(8);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const db = getDb();
    const partyId = generateId();

    const menuItemValues = DEFAULT_SUPPLIES.map((supplyName) => ({
      id: generateId(),
      partyId,
      name: supplyName,
      category: 'SUPPLY',
      available: true,
      createdAt,
    }));

    // Use db.batch() to insert the party and its default menu items atomically.
    // D1 batch executes all statements in a single transaction, preventing
    // partial writes (e.g., party without menu items if the second insert fails).
    const [partyResult, itemsResult] = await db.batch([
      db.insert(parties).values({
        id: partyId,
        name,
        guestCode,
        hostCode,
        createdAt,
        expiresAt,
      }).returning(),
      db.insert(menuItems).values(menuItemValues).returning(),
    ]);

    const party = partyResult[0];
    const insertedItems = itemsResult;

    return NextResponse.json({ ...party, menuItems: insertedItems }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create party';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

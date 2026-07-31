import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, menuItems } from '@/lib/schema';
import { generateId } from '@/lib/id';
import { generatePartyCode } from '@/lib/codes';
import { eq } from 'drizzle-orm';

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

    const [party] = await db
      .insert(parties)
      .values({
        id: partyId,
        name,
        guestCode,
        hostCode,
        createdAt,
        expiresAt,
      })
      .returning();

    const menuItemValues = DEFAULT_SUPPLIES.map((supplyName) => ({
      id: generateId(),
      partyId: party.id,
      name: supplyName,
      category: 'SUPPLY',
      available: true,
      createdAt,
    }));

    const insertedItems = await db
      .insert(menuItems)
      .values(menuItemValues)
      .returning();

    return NextResponse.json({ ...party, menuItems: insertedItems }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create party';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

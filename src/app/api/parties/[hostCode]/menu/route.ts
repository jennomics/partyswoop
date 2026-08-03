import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, menuItems } from '@/lib/schema';
import { generateId } from '@/lib/id';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hostCode: string }> }
) {
  try {
    const { hostCode } = await params;
    const db = getDb();

    const party = await db.query.parties.findFirst({
      where: eq(parties.hostCode, hostCode),
      columns: { id: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > new Date(party.expiresAt)) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.partyId, party.id))
      .orderBy(asc(menuItems.createdAt));

    return NextResponse.json(items);
  } catch (error) {
    console.error('Failed to fetch menu items:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hostCode: string }> }
) {
  try {
    const { hostCode } = await params;
    const db = getDb();

    const party = await db.query.parties.findFirst({
      where: eq(parties.hostCode, hostCode),
      columns: { id: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > new Date(party.expiresAt)) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    const body = await request.json() as Record<string, unknown>;
    const name = (body.name as string | undefined)?.trim();

    if (!name) {
      return NextResponse.json(
        { error: 'Drink name is required.' },
        { status: 400 }
      );
    }

    const category = body.category === 'SUPPLY' ? 'SUPPLY' : 'DRINK';
    const rawQuantity = body.quantity !== undefined && body.quantity !== null
      ? Number(body.quantity)
      : null;

    if (rawQuantity !== null && isNaN(rawQuantity)) {
      return NextResponse.json(
        { error: 'Quantity must be a valid number.' },
        { status: 400 }
      );
    }

    const quantity = rawQuantity !== null ? Math.max(0, Math.floor(rawQuantity)) : null;

    const [menuItem] = await db
      .insert(menuItems)
      .values({
        id: generateId(),
        partyId: party.id,
        name,
        category,
        available: true,
        quantity,
      })
      .returning();

    return NextResponse.json(menuItem, { status: 201 });
  } catch (error) {
    console.error('Failed to add menu item:', error);
    return NextResponse.json({ error: 'Failed to add menu item.' }, { status: 500 });
  }
}

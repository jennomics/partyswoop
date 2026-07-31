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
    const message = error instanceof Error ? error.message : 'Failed to fetch menu items';
    return NextResponse.json({ error: message }, { status: 500 });
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

    const body = await request.json() as Record<string, any>;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: 'Drink name is required.' },
        { status: 400 }
      );
    }

    const [menuItem] = await db
      .insert(menuItems)
      .values({
        id: generateId(),
        partyId: party.id,
        name,
        category: 'DRINK',
        available: true,
      })
      .returning();

    return NextResponse.json(menuItem, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add menu item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

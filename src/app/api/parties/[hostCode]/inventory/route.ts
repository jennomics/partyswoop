import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, menuItems } from '@/lib/schema';
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
      .orderBy(asc(menuItems.category), asc(menuItems.name));

    const itemsWithStock = items.map((item) => ({
      ...item,
      isLowStock:
        item.quantity !== null &&
        item.quantity > 0 &&
        item.quantity <= item.lowStockThreshold,
      isOutOfStock: item.quantity !== null && item.quantity === 0,
    }));

    // Group by category
    const grouped: Record<string, typeof itemsWithStock> = {};
    for (const item of itemsWithStock) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }

    return NextResponse.json({ items: itemsWithStock, grouped });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, menuItems } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ hostCode: string; itemId: string }> }
) {
  try {
    const { hostCode, itemId } = await params;
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

    const existingItem = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.partyId, party.id)),
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Menu item not found.' }, { status: 404 });
    }

    const body = await request.json() as Record<string, unknown>;
    const updateData: { name?: string; available?: boolean; quantity?: number | null; lowStockThreshold?: number } = {};

    if (body.name !== undefined) {
      const name = (body.name as string | undefined)?.trim();
      if (!name) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      }
      updateData.name = name;
    }

    if (body.available !== undefined) {
      updateData.available = Boolean(body.available);
    }

    if (body.quantity !== undefined) {
      if (body.quantity === null) {
        updateData.quantity = null;
      } else {
        const rawQty = Number(body.quantity);
        if (isNaN(rawQty)) {
          return NextResponse.json({ error: 'Quantity must be a valid number.' }, { status: 400 });
        }
        updateData.quantity = Math.max(0, Math.floor(rawQty));
      }
    }

    if (body.lowStockThreshold !== undefined) {
      const rawThreshold = Number(body.lowStockThreshold);
      if (isNaN(rawThreshold)) {
        return NextResponse.json({ error: 'Threshold must be a valid number.' }, { status: 400 });
      }
      updateData.lowStockThreshold = Math.max(0, Math.floor(rawThreshold));
    }

    const [updatedItem] = await db
      .update(menuItems)
      .set(updateData)
      .where(eq(menuItems.id, itemId))
      .returning();

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Failed to update menu item:', error);
    return NextResponse.json({ error: 'Failed to update menu item.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ hostCode: string; itemId: string }> }
) {
  try {
    const { hostCode, itemId } = await params;
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

    const existingItem = await db.query.menuItems.findFirst({
      where: and(eq(menuItems.id, itemId), eq(menuItems.partyId, party.id)),
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Menu item not found.' }, { status: 404 });
    }

    await db.delete(menuItems).where(eq(menuItems.id, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete menu item:', error);
    return NextResponse.json({ error: 'Failed to delete menu item.' }, { status: 500 });
  }
}

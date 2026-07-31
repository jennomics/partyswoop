import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, menuItems } from '@/lib/schema';
import { sseEventBus } from '@/lib/sse';
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

    const body = await request.json() as Record<string, any>;
    const updateData: { name?: string; available?: boolean } = {};

    if (body.name !== undefined) {
      const name = body.name?.trim();
      if (!name) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      }
      updateData.name = name;
    }

    if (body.available !== undefined) {
      updateData.available = Boolean(body.available);
    }

    const [updatedItem] = await db
      .update(menuItems)
      .set(updateData)
      .where(eq(menuItems.id, itemId))
      .returning();

    // Publish SSE event to notify connected guests
    sseEventBus.publish(party.id, 'menu-update', updatedItem);

    return NextResponse.json(updatedItem);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update menu item';
    return NextResponse.json({ error: message }, { status: 500 });
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

    // Publish SSE event to notify connected guests
    sseEventBus.publish(party.id, 'menu-update', { deleted: itemId });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete menu item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sseEventBus } from '@/lib/sse';

export async function PATCH(
  request: Request,
  { params }: { params: { hostCode: string; itemId: string } }
) {
  try {
    const party = await prisma.party.findUnique({
      where: { hostCode: params.hostCode },
      select: { id: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > party.expiresAt) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    const existingItem = await prisma.menuItem.findFirst({
      where: { id: params.itemId, partyId: party.id },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Menu item not found.' }, { status: 404 });
    }

    const body = await request.json();
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

    const updatedItem = await prisma.menuItem.update({
      where: { id: params.itemId },
      data: updateData,
    });

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
  { params }: { params: { hostCode: string; itemId: string } }
) {
  try {
    const party = await prisma.party.findUnique({
      where: { hostCode: params.hostCode },
      select: { id: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > party.expiresAt) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    const existingItem = await prisma.menuItem.findFirst({
      where: { id: params.itemId, partyId: party.id },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Menu item not found.' }, { status: 404 });
    }

    await prisma.menuItem.delete({ where: { id: params.itemId } });

    // Publish SSE event to notify connected guests
    sseEventBus.publish(party.id, 'menu-update', { deleted: params.itemId });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete menu item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

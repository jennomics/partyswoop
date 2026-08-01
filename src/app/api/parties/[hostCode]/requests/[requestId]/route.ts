import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, requests, menuItems } from '@/lib/schema';
import { sseEventBus } from '@/lib/sse';
import { validateStatusTransition } from '@/lib/validation';
import { eq, and } from 'drizzle-orm';
import type { RequestStatus } from '@/lib/validation';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ hostCode: string; requestId: string }> }
) {
  try {
    const { hostCode, requestId } = await params;
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

    const existingRequest = await db.query.requests.findFirst({
      where: and(eq(requests.id, requestId), eq(requests.partyId, party.id)),
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    const body = await request.json() as Record<string, any>;
    const validation = validateStatusTransition(
      existingRequest.status as RequestStatus,
      body.status
    );

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const [updated] = await db
      .update(requests)
      .set({ status: body.status })
      .where(eq(requests.id, requestId))
      .returning();

    // Auto-decrement inventory when a DRINK or SUPPLY request is marked DONE
    if (
      body.status === 'DONE' &&
      (existingRequest.category === 'DRINK' || existingRequest.category === 'SUPPLY')
    ) {
      const matchingItem = await db.query.menuItems.findFirst({
        where: and(
          eq(menuItems.partyId, party.id),
          eq(menuItems.name, existingRequest.item)
        ),
      });

      if (matchingItem && matchingItem.quantity !== null && matchingItem.quantity > 0) {
        const newQuantity = matchingItem.quantity - 1;
        const updateData: { quantity: number; available?: boolean } = { quantity: newQuantity };

        if (newQuantity === 0) {
          updateData.available = false;
        }

        const [updatedItem] = await db
          .update(menuItems)
          .set(updateData)
          .where(eq(menuItems.id, matchingItem.id))
          .returning();

        // Publish inventory-update SSE event
        sseEventBus.publish(party.id, 'inventory-update', {
          ...updatedItem,
          isLowStock:
            updatedItem.quantity !== null &&
            updatedItem.quantity > 0 &&
            updatedItem.quantity <= updatedItem.lowStockThreshold,
          isOutOfStock: updatedItem.quantity !== null && updatedItem.quantity === 0,
        });
      }
    }

    // Fetch with location relation for the response
    const updatedRequest = await db.query.requests.findFirst({
      where: eq(requests.id, requestId),
      with: { location: true },
    });

    // Publish SSE event
    sseEventBus.publish(party.id, 'request-update', updatedRequest);

    return NextResponse.json(updatedRequest);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

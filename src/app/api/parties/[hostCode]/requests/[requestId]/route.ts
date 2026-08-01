import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, requests, menuItems } from '@/lib/schema';
import { sseEventBus } from '@/lib/sse';
import { validateStatusTransition } from '@/lib/validation';
import { eq, and, gt, sql } from 'drizzle-orm';
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

    // Auto-decrement inventory when a DRINK or SUPPLY request is marked DONE.
    // NOTE: Item matching is by name. If the host renames a menu item after a request
    // is submitted, the decrement will silently fail. Storing menuItemId on requests
    // would require a schema migration and is tracked as a future improvement.
    if (
      body.status === 'DONE' &&
      (existingRequest.category === 'DRINK' || existingRequest.category === 'SUPPLY')
    ) {
      // Use a single atomic UPDATE with a WHERE quantity > 0 guard to prevent
      // race conditions from concurrent fulfillments of the same item.
      const [updatedItem] = await db
        .update(menuItems)
        .set({ quantity: sql`${menuItems.quantity} - 1` })
        .where(
          and(
            eq(menuItems.partyId, party.id),
            eq(menuItems.name, existingRequest.item),
            gt(menuItems.quantity, 0)
          )
        )
        .returning();

      if (updatedItem) {
        // If quantity hit 0, mark item as unavailable
        if (updatedItem.quantity === 0) {
          await db
            .update(menuItems)
            .set({ available: false })
            .where(eq(menuItems.id, updatedItem.id));
        }

        // Publish inventory-update SSE event
        sseEventBus.publish(party.id, 'inventory-update', {
          ...updatedItem,
          available: updatedItem.quantity === 0 ? false : updatedItem.available,
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

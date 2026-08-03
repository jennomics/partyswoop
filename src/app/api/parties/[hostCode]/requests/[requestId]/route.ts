import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, requests, menuItems } from '@/lib/schema';
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

    const body = await request.json() as Record<string, unknown>;
    const validation = validateStatusTransition(
      existingRequest.status as RequestStatus,
      body.status
    );

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const newStatus = body.status as string;

    // Determine if we need to decrement inventory (DRINK/SUPPLY marked DONE).
    const needsDecrement =
      newStatus === 'DONE' &&
      (existingRequest.category === 'DRINK' || existingRequest.category === 'SUPPLY');

    // Build the status update query with conditional WHERE to prevent race conditions.
    const statusUpdate = db
      .update(requests)
      .set({ status: newStatus })
      .where(
        and(
          eq(requests.id, requestId),
          eq(requests.status, existingRequest.status)
        )
      )
      .returning();

    if (needsDecrement) {
      // Use db.batch() to atomically update status AND decrement inventory.
      // D1's batch wraps all statements in a single transaction.
      const menuItemCondition = existingRequest.menuItemId
        ? and(
            eq(menuItems.id, existingRequest.menuItemId),
            gt(menuItems.quantity, 0)
          )
        : and(
            eq(menuItems.partyId, party.id),
            eq(menuItems.name, existingRequest.item),
            gt(menuItems.quantity, 0)
          );

      // Decrement quantity and set available=false when quantity reaches 0 via CASE expression.
      const inventoryDecrement = db
        .update(menuItems)
        .set({
          quantity: sql`${menuItems.quantity} - 1`,
          available: sql`CASE WHEN ${menuItems.quantity} - 1 <= 0 THEN 0 ELSE ${menuItems.available} END`,
        })
        .where(menuItemCondition)
        .returning();

      const [updateResult] = await db.batch([
        statusUpdate,
        inventoryDecrement,
      ]);

      if (updateResult.length === 0) {
        return NextResponse.json(
          { error: 'Request was already updated. Please refresh and try again.' },
          { status: 409 }
        );
      }
    } else {
      // No inventory to decrement, just update status.
      const updateResult = await statusUpdate;

      if (updateResult.length === 0) {
        return NextResponse.json(
          { error: 'Request was already updated. Please refresh and try again.' },
          { status: 409 }
        );
      }
    }

    // Fetch with location relation for the response
    const updatedRequest = await db.query.requests.findFirst({
      where: eq(requests.id, requestId),
      with: { location: true },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Failed to update request:', error);
    return NextResponse.json({ error: 'Failed to update request.' }, { status: 500 });
  }
}

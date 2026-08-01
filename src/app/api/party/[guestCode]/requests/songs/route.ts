import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, requests } from '@/lib/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ guestCode: string }> }
) {
  try {
    const { guestCode } = await params;
    const db = getDb();

    const party = await db.query.parties.findFirst({
      where: eq(parties.guestCode, guestCode),
      columns: { id: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > new Date(party.expiresAt)) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    const songRequests = await db
      .select({
        id: requests.id,
        item: requests.item,
        deliveryValue: requests.deliveryValue,
        status: requests.status,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .where(
        and(
          eq(requests.partyId, party.id),
          eq(requests.category, 'SONG')
        )
      )
      .orderBy(asc(requests.createdAt));

    return NextResponse.json(songRequests);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch song queue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

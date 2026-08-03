import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, requests } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ guestCode: string; requestId: string }> }
) {
  try {
    const { guestCode, requestId } = await params;
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

    const requestRecord = await db.query.requests.findFirst({
      where: and(eq(requests.id, requestId), eq(requests.partyId, party.id)),
      with: { location: true },
    });

    if (!requestRecord) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    return NextResponse.json(requestRecord);
  } catch (error) {
    console.error('Failed to fetch request:', error);
    return NextResponse.json({ error: 'Failed to fetch request.' }, { status: 500 });
  }
}

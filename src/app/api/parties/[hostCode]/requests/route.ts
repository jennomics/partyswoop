import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, requests } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

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

    const partyRequests = await db.query.requests.findMany({
      where: eq(requests.partyId, party.id),
      with: { location: true },
      orderBy: [desc(requests.createdAt)],
    });

    return NextResponse.json(partyRequests);
  } catch (error) {
    console.error('Failed to fetch requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests.' }, { status: 500 });
  }
}

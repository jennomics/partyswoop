import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, requests, locations } from '@/lib/schema';
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
      columns: { id: true, name: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > new Date(party.expiresAt)) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    const supplyRequests = await db
      .select({
        id: requests.id,
        item: requests.item,
        deliveryType: requests.deliveryType,
        deliveryValue: requests.deliveryValue,
        status: requests.status,
        createdAt: requests.createdAt,
        locationId: requests.locationId,
        locationName: locations.name,
      })
      .from(requests)
      .leftJoin(locations, eq(requests.locationId, locations.id))
      .where(
        and(
          eq(requests.partyId, party.id),
          eq(requests.category, 'SUPPLY')
        )
      )
      .orderBy(asc(requests.createdAt));

    const result = supplyRequests.map((r) => ({
      id: r.id,
      item: r.item,
      deliveryType: r.deliveryType,
      deliveryValue: r.deliveryValue,
      status: r.status,
      createdAt: r.createdAt,
      location: r.locationId ? { id: r.locationId, name: r.locationName } : null,
    }));

    return NextResponse.json({ supplies: result, partyName: party.name });
  } catch (error) {
    console.error('Failed to fetch supply queue:', error);
    return NextResponse.json({ error: 'Failed to fetch supply queue.' }, { status: 500 });
  }
}

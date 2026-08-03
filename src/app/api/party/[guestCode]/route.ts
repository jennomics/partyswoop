import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, menuItems, locations } from '@/lib/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ guestCode: string }> }
) {
  try {
    const { guestCode } = await params;
    const { searchParams } = new URL(request.url);
    const locationCode = searchParams.get('loc') || searchParams.get('location');
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

    // Fetch available menu items and all locations
    const availableMenuItems = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.partyId, party.id), eq(menuItems.available, true)))
      .orderBy(asc(menuItems.createdAt));

    const partyLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.partyId, party.id));

    // Find location if code provided
    let currentLocation = null;
    if (locationCode) {
      currentLocation = partyLocations.find((l) => l.code === locationCode) || null;
    }

    return NextResponse.json({
      name: party.name,
      menuItems: availableMenuItems,
      locations: partyLocations,
      currentLocation,
    });
  } catch (error) {
    console.error('Failed to fetch party:', error);
    return NextResponse.json({ error: 'Failed to fetch party.' }, { status: 500 });
  }
}

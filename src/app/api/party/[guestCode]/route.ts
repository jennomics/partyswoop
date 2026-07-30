import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { guestCode: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const locationCode = searchParams.get('location');

    const party = await prisma.party.findUnique({
      where: { guestCode: params.guestCode },
      select: {
        id: true,
        name: true,
        expiresAt: true,
        menuItems: {
          where: { available: true },
          orderBy: { createdAt: 'asc' },
        },
        locations: true,
      },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > party.expiresAt) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    // Find location if code provided
    let currentLocation = null;
    if (locationCode) {
      currentLocation = party.locations.find((l) => l.code === locationCode) || null;
    }

    return NextResponse.json({
      name: party.name,
      menuItems: party.menuItems,
      locations: party.locations,
      currentLocation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch party';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

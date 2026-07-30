import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateLocationCode } from '@/lib/codes';

export async function GET(
  request: Request,
  { params }: { params: { hostCode: string } }
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

    const locations = await prisma.location.findMany({
      where: { partyId: party.id },
    });

    return NextResponse.json(locations);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch locations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { hostCode: string } }
) {
  try {
    const party = await prisma.party.findUnique({
      where: { hostCode: params.hostCode },
      select: { id: true, guestCode: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > party.expiresAt) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: 'Location name is required.' },
        { status: 400 }
      );
    }

    const code = generateLocationCode(6);

    const location = await prisma.location.create({
      data: {
        partyId: party.id,
        name,
        code,
      },
    });

    return NextResponse.json(
      {
        ...location,
        guestLink: `/party/${party.guestCode}?location=${code}`,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create location';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

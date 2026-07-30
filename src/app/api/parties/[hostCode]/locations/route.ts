import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateLocationCode } from '@/lib/codes';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hostCode: string }> }
) {
  try {
    const { hostCode } = await params;
    const party = await prisma.party.findUnique({
      where: { hostCode },
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
  { params }: { params: Promise<{ hostCode: string }> }
) {
  try {
    const { hostCode } = await params;
    const party = await prisma.party.findUnique({
      where: { hostCode },
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

    // Retry with new codes on unique constraint collision (max 3 attempts)
    const MAX_CODE_ATTEMPTS = 3;
    let location;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = generateLocationCode(6);
      try {
        location = await prisma.location.create({
          data: {
            partyId: party.id,
            name,
            code,
          },
        });
        break;
      } catch (err: unknown) {
        // Prisma unique constraint violation code
        const isPrismaUniqueError =
          err !== null &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === 'P2002';
        if (isPrismaUniqueError && attempt < MAX_CODE_ATTEMPTS - 1) {
          continue; // Retry with a new code
        }
        throw err;
      }
    }

    return NextResponse.json(
      {
        ...location,
        guestLink: `/party/${party.guestCode}?location=${location!.code}`,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create location';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

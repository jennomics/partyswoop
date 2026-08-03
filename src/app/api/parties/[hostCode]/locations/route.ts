import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, locations } from '@/lib/schema';
import { generateId } from '@/lib/id';
import { generateLocationCode } from '@/lib/codes';
import { eq } from 'drizzle-orm';

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

    const partyLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.partyId, party.id));

    return NextResponse.json(partyLocations);
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hostCode: string }> }
) {
  try {
    const { hostCode } = await params;
    const db = getDb();

    const party = await db.query.parties.findFirst({
      where: eq(parties.hostCode, hostCode),
      columns: { id: true, guestCode: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > new Date(party.expiresAt)) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    const body = await request.json() as Record<string, unknown>;
    const name = (body.name as string | undefined)?.trim();

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
        const [inserted] = await db
          .insert(locations)
          .values({
            id: generateId(),
            partyId: party.id,
            name,
            code,
          })
          .returning();
        location = inserted;
        break;
      } catch (err: unknown) {
        // SQLite UNIQUE constraint error
        const isUniqueError =
          err instanceof Error &&
          err.message.includes('UNIQUE constraint failed');
        if (isUniqueError && attempt < MAX_CODE_ATTEMPTS - 1) {
          continue; // Retry with a new code
        }
        throw err;
      }
    }

    return NextResponse.json(
      {
        ...location,
        guestLink: `/party/${party.guestCode}?loc=${location!.code}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create location:', error);
    return NextResponse.json({ error: 'Failed to create location.' }, { status: 500 });
  }
}

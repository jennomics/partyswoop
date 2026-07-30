import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ guestCode: string; requestId: string }> }
) {
  try {
    const { guestCode, requestId } = await params;
    const party = await prisma.party.findUnique({
      where: { guestCode },
      select: { id: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > party.expiresAt) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    const requestRecord = await prisma.request.findFirst({
      where: { id: requestId, partyId: party.id },
      include: { location: true },
    });

    if (!requestRecord) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    return NextResponse.json(requestRecord);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

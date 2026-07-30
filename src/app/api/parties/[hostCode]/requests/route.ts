import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    const requests = await prisma.request.findMany({
      where: { partyId: party.id },
      include: { location: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

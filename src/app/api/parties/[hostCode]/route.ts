import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { hostCode: string } }
) {
  try {
    const party = await prisma.party.findUnique({
      where: { hostCode: params.hostCode },
      include: {
        menuItems: { orderBy: { createdAt: 'asc' } },
        locations: true,
        requests: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > party.expiresAt) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    return NextResponse.json(party);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch party';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

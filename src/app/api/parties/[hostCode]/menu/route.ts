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

    const menuItems = await prisma.menuItem.findMany({
      where: { partyId: party.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(menuItems);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch menu items';
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
      select: { id: true, expiresAt: true },
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
        { error: 'Drink name is required.' },
        { status: 400 }
      );
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        partyId: party.id,
        name,
        category: 'DRINK',
        available: true,
      },
    });

    return NextResponse.json(menuItem, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add menu item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

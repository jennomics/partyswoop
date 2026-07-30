import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePartyCode } from '@/lib/codes';

const DEFAULT_SUPPLIES = [
  'Toilet Paper',
  'Sunscreen',
  'Bug Spray',
  'Ice',
  'Cups',
  'Napkins',
  'Paper Towels',
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = body.name?.trim() || 'My Party';

    const guestCode = generatePartyCode(8);
    const hostCode = generatePartyCode(8);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    const party = await prisma.party.create({
      data: {
        name,
        guestCode,
        hostCode,
        createdAt,
        expiresAt,
        menuItems: {
          create: DEFAULT_SUPPLIES.map((supplyName) => ({
            name: supplyName,
            category: 'SUPPLY',
            available: true,
          })),
        },
      },
      include: {
        menuItems: true,
      },
    });

    return NextResponse.json(party, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create party';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

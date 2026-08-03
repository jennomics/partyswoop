import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, menuItems } from '@/lib/schema';
import { generateId } from '@/lib/id';
import { generatePartyCode } from '@/lib/codes';
import { checkRateLimit } from '@/lib/rateLimit';

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
    const db = getDb();

    // Rate limit: 5 party creations per hour per IP
    const forwarded = request.headers.get('x-forwarded-for');
    const cfIp = request.headers.get('cf-connecting-ip');
    const ip = cfIp || forwarded?.split(',')[0]?.trim() || 'unknown';
    const rateLimitResult = await checkRateLimit(db, `create-party:${ip}`, 3_600_000, 5);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many parties created. Please wait before creating another.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimitResult.retryAfterMs / 1000)),
          },
        }
      );
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const name = (typeof body.name === 'string' ? body.name.trim() : '') || 'My Party';

    const guestCode = generatePartyCode(8);
    const hostCode = generatePartyCode(8);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const partyId = generateId();

    const menuItemValues = DEFAULT_SUPPLIES.map((supplyName) => ({
      id: generateId(),
      partyId,
      name: supplyName,
      category: 'SUPPLY',
      available: true,
      createdAt,
    }));

    const [partyResult, itemsResult] = await db.batch([
      db.insert(parties).values({
        id: partyId,
        name,
        guestCode,
        hostCode,
        createdAt,
        expiresAt,
      }).returning(),
      db.insert(menuItems).values(menuItemValues).returning(),
    ]);

    const party = partyResult[0];
    const insertedItems = itemsResult;

    return NextResponse.json({ ...party, menuItems: insertedItems }, { status: 201 });
  } catch (error) {
    console.error('Failed to create party:', error);
    return NextResponse.json({ error: 'Failed to create party.' }, { status: 500 });
  }
}

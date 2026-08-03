import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, menuItems, locations, requests } from '@/lib/schema';
import { generateId } from '@/lib/id';
import { checkRateLimit } from '@/lib/rateLimit';
import { validateRequestCategory, validateDeliveryTarget } from '@/lib/validation';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ guestCode: string }> }
) {
  try {
    const { guestCode } = await params;
    const db = getDb();

    const party = await db.query.parties.findFirst({
      where: eq(parties.guestCode, guestCode),
      columns: { id: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > new Date(party.expiresAt)) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    // Rate limit: 20 requests per minute per party (D1-backed)
    const rateLimitResult = await checkRateLimit(db, `guest-request:${party.id}`, 60_000, 20);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before submitting again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimitResult.retryAfterMs / 1000)),
          },
        }
      );
    }

    // Fetch available menu items and locations
    const availableMenuItems = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.partyId, party.id), eq(menuItems.available, true)));

    const partyLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.partyId, party.id));

    const body = await request.json() as Record<string, unknown>;

    // Validate category
    const categoryValidation = validateRequestCategory(body.category);
    if (!categoryValidation.valid) {
      return NextResponse.json({ error: categoryValidation.error }, { status: 400 });
    }

    const category = body.category as 'DRINK' | 'SUPPLY' | 'SONG' | 'OTHER';
    const bodyItem = typeof body.item === 'string' ? body.item.trim() : '';
    const bodyDeliveryType = typeof body.deliveryType === 'string' ? body.deliveryType : '';
    const bodyDeliveryValue = typeof body.deliveryValue === 'string' ? body.deliveryValue.trim() : '';
    const bodyNote = typeof body.note === 'string' ? body.note.trim() : null;

    // Validate item for DRINK and SUPPLY categories
    let menuItemId: string | null = null;
    if (category === 'DRINK' || category === 'SUPPLY') {
      if (!bodyItem) {
        return NextResponse.json(
          { error: `Item name is required for ${category} requests.` },
          { status: 400 }
        );
      }

      // For DRINK requests, item must be on the available menu
      if (category === 'DRINK') {
        const availableDrink = availableMenuItems.find(
          (item) => item.category === 'DRINK' && item.name === bodyItem
        );
        if (!availableDrink) {
          return NextResponse.json(
            { error: `"${bodyItem}" is not available on the drink menu.` },
            { status: 400 }
          );
        }
        menuItemId = availableDrink.id;
      }

      // For SUPPLY requests, try to find the matching menu item
      if (category === 'SUPPLY') {
        const matchingSupply = availableMenuItems.find(
          (item) => item.category === 'SUPPLY' && item.name === bodyItem
        );
        if (matchingSupply) {
          menuItemId = matchingSupply.id;
        }
      }
    }

    // Validate delivery for DRINK requests
    let deliveryType: string = bodyDeliveryType || 'NAME';
    let deliveryValue: string = bodyDeliveryValue || '';

    if (category === 'DRINK') {
      const deliveryValidation = validateDeliveryTarget(body.deliveryType, body.deliveryValue);
      if (!deliveryValidation.valid) {
        return NextResponse.json({ error: deliveryValidation.error }, { status: 400 });
      }
      deliveryType = bodyDeliveryType;
      deliveryValue = bodyDeliveryValue;

      // LOCATION delivery only allowed if a valid location exists
      if (deliveryType === 'LOCATION') {
        const location = partyLocations.find((l) => l.name === deliveryValue || l.code === deliveryValue);
        if (!location) {
          return NextResponse.json(
            { error: 'The specified delivery location does not exist at this party.' },
            { status: 400 }
          );
        }
      }
    }

    // For non-DRINK categories, set default delivery if not specified
    if (category !== 'DRINK') {
      deliveryType = bodyDeliveryType || 'NAME';
      deliveryValue = bodyDeliveryValue || bodyItem || category;
    }

    // Find locationId if delivery type is LOCATION
    let locationId: string | null = null;
    if (deliveryType === 'LOCATION') {
      const location = partyLocations.find(
        (l) => l.name === deliveryValue || l.code === deliveryValue
      );
      if (location) {
        locationId = location.id;
      }
    }

    const [newRequest] = await db
      .insert(requests)
      .values({
        id: generateId(),
        partyId: party.id,
        category,
        item: bodyItem || category,
        note: bodyNote || null,
        deliveryType,
        deliveryValue,
        status: 'NEW',
        locationId,
        menuItemId,
      })
      .returning();

    // Fetch with location relation for the response
    const requestWithLocation = await db.query.requests.findFirst({
      where: eq(requests.id, newRequest.id),
      with: { location: true },
    });

    return NextResponse.json(requestWithLocation, { status: 201 });
  } catch (error) {
    console.error('Failed to submit request:', error);
    return NextResponse.json({ error: 'Failed to submit request.' }, { status: 500 });
  }
}

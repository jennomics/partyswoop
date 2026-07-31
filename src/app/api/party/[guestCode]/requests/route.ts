import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parties, menuItems, locations, requests } from '@/lib/schema';
import { generateId } from '@/lib/id';
import { sseEventBus } from '@/lib/sse';
import { guestRequestLimiter } from '@/lib/rateLimit';
import { validateRequestCategory, validateDeliveryTarget } from '@/lib/validation';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ guestCode: string }> }
) {
  try {
    const { guestCode } = await params;

    // Rate limit by guestCode (bounds abuse per-party link, not spoofable like X-Forwarded-For)
    const rateLimitResult = guestRequestLimiter.check(guestCode);

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

    // Fetch available menu items and locations
    const availableMenuItems = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.partyId, party.id), eq(menuItems.available, true)));

    const partyLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.partyId, party.id));

    const body = await request.json() as Record<string, any>;

    // Validate category
    const categoryValidation = validateRequestCategory(body.category);
    if (!categoryValidation.valid) {
      return NextResponse.json({ error: categoryValidation.error }, { status: 400 });
    }

    const category = body.category as 'DRINK' | 'SUPPLY' | 'SONG' | 'OTHER';

    // Validate item for DRINK and SUPPLY categories
    if (category === 'DRINK' || category === 'SUPPLY') {
      if (!body.item || body.item.trim() === '') {
        return NextResponse.json(
          { error: `Item name is required for ${category} requests.` },
          { status: 400 }
        );
      }

      // For DRINK requests, item must be on the available menu
      if (category === 'DRINK') {
        const availableDrink = availableMenuItems.find(
          (item) => item.category === 'DRINK' && item.name === body.item.trim()
        );
        if (!availableDrink) {
          return NextResponse.json(
            { error: `"${body.item}" is not available on the drink menu.` },
            { status: 400 }
          );
        }
      }
    }

    // Validate delivery for DRINK requests
    let deliveryType = body.deliveryType || 'NAME';
    let deliveryValue = body.deliveryValue || '';

    if (category === 'DRINK') {
      const deliveryValidation = validateDeliveryTarget(body.deliveryType, body.deliveryValue);
      if (!deliveryValidation.valid) {
        return NextResponse.json({ error: deliveryValidation.error }, { status: 400 });
      }
      deliveryType = body.deliveryType;
      deliveryValue = body.deliveryValue.trim();

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
      deliveryType = body.deliveryType || 'NAME';
      deliveryValue = body.deliveryValue?.trim() || body.item?.trim() || category;
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
        item: body.item?.trim() || category,
        note: body.note?.trim() || null,
        deliveryType,
        deliveryValue,
        status: 'NEW',
        locationId,
      })
      .returning();

    // Fetch with location relation for the response
    const requestWithLocation = await db.query.requests.findFirst({
      where: eq(requests.id, newRequest.id),
      with: { location: true },
    });

    // Publish SSE event to host
    sseEventBus.publish(party.id, 'new-request', requestWithLocation);

    return NextResponse.json(requestWithLocation, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

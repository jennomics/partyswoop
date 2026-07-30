import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sseEventBus } from '@/lib/sse';
import { guestRequestLimiter } from '@/lib/rateLimit';
import { validateRequestCategory, validateDeliveryTarget } from '@/lib/validation';

export async function POST(
  request: Request,
  { params }: { params: { guestCode: string } }
) {
  try {
    // Rate limit by guestCode (bounds abuse per-party link, not spoofable like X-Forwarded-For)
    const rateLimitResult = guestRequestLimiter.check(params.guestCode);

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
    const party = await prisma.party.findUnique({
      where: { guestCode: params.guestCode },
      select: {
        id: true,
        expiresAt: true,
        menuItems: { where: { available: true } },
        locations: true,
      },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > party.expiresAt) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    const body = await request.json();

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
        const availableDrink = party.menuItems.find(
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
        const location = party.locations.find((l) => l.name === deliveryValue || l.code === deliveryValue);
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
      const location = party.locations.find(
        (l) => l.name === deliveryValue || l.code === deliveryValue
      );
      if (location) {
        locationId = location.id;
      }
    }

    const newRequest = await prisma.request.create({
      data: {
        partyId: party.id,
        category,
        item: body.item?.trim() || category,
        note: body.note?.trim() || null,
        deliveryType,
        deliveryValue,
        status: 'NEW',
        locationId,
      },
      include: { location: true },
    });

    // Publish SSE event to host
    sseEventBus.publish(party.id, 'new-request', newRequest);

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

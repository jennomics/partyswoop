import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sseEventBus } from '@/lib/sse';
import { validateStatusTransition } from '@/lib/validation';

export async function PATCH(
  request: Request,
  { params }: { params: { hostCode: string; requestId: string } }
) {
  try {
    const party = await prisma.party.findUnique({
      where: { hostCode: params.hostCode },
      select: { id: true, expiresAt: true },
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found.' }, { status: 404 });
    }

    if (new Date() > party.expiresAt) {
      return NextResponse.json({ error: 'This party has expired.' }, { status: 404 });
    }

    const existingRequest = await prisma.request.findFirst({
      where: { id: params.requestId, partyId: party.id },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateStatusTransition(existingRequest.status, body.status);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updatedRequest = await prisma.request.update({
      where: { id: params.requestId },
      data: { status: body.status },
      include: { location: true },
    });

    // Publish SSE event
    sseEventBus.publish(party.id, 'request-update', updatedRequest);

    return NextResponse.json(updatedRequest);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

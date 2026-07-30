import { prisma } from '@/lib/db';
import { sseEventBus, SSE_HEARTBEAT_INTERVAL_MS } from '@/lib/sse';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { hostCode: string } }
) {
  try {
    const party = await prisma.party.findUnique({
      where: { hostCode: params.hostCode },
      select: { id: true, expiresAt: true },
    });

    if (!party) {
      return new Response(JSON.stringify({ error: 'Party not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (new Date() > party.expiresAt) {
      return new Response(JSON.stringify({ error: 'This party has expired.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        // Send initial connection event
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ partyId: party.id })}\n\n`)
        );

        // Heartbeat to keep connection alive through proxies/load balancers
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch {
            clearInterval(heartbeat);
          }
        }, SSE_HEARTBEAT_INTERVAL_MS);

        // Subscribe to party events (host receives new-request and request-update)
        const unsubscribe = sseEventBus.subscribe(party.id, (eventType, data) => {
          try {
            const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch {
            // Stream might be closed
          }
        });

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to establish SSE connection';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

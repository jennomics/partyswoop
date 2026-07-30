import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Security model for host endpoints:
 *
 * Authorization is based solely on possession of the unguessable hostCode (~46 bits
 * of entropy from a 55-char alphabet, 8 chars). There are no sessions, cookies, or
 * authentication tokens.
 *
 * CSRF protection: All state-mutating host endpoints require JSON Content-Type bodies.
 * Browsers enforce CORS preflight for cross-origin requests with non-simple content
 * types, which blocks cross-site form submissions and scripted attacks from other
 * origins. Since no cookies are used, there are no ambient credentials to exploit.
 * This is a deliberate security boundary -- if sessions or cookies are ever added,
 * explicit CSRF tokens must also be introduced.
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hostCode: string }> }
) {
  try {
    const { hostCode } = await params;
    const party = await prisma.party.findUnique({
      where: { hostCode },
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

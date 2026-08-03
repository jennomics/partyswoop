import { NextResponse } from 'next/server';

// TODO: Implement a Cloudflare Cron Trigger (scheduled handler) to clean up
// expired parties. The trigger should run periodically (e.g., every hour) and
// delete all parties where expiresAt < now. This prevents stale data from
// accumulating in D1. See: https://developers.cloudflare.com/workers/configuration/cron-triggers/

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

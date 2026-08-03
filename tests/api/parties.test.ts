import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb, getTestDb } from '../helpers/setup';
import { createTestParty } from '../helpers/fixtures';
import { POST } from '@/app/api/parties/route';
import { GET } from '@/app/api/parties/[hostCode]/route';

describe('POST /api/parties', () => {
  beforeEach(() => {
    setupTestDb();
  });

  it('creates a party and returns 201 with party data', async () => {
    const request = new Request('http://localhost/api/parties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
      body: JSON.stringify({ name: 'Birthday Bash' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('Birthday Bash');
    expect(data.guestCode).toBeDefined();
    expect(data.hostCode).toBeDefined();
    expect(data.expiresAt).toBeDefined();
    expect(data.menuItems).toBeDefined();
    expect(data.menuItems.length).toBeGreaterThan(0);
  });

  it('uses default name when none provided', async () => {
    const request = new Request('http://localhost/api/parties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('My Party');
  });

  it('rate limits party creation to 5 per hour per IP', async () => {
    const ip = '192.168.1.100';

    // Create 5 parties (should all succeed)
    for (let i = 0; i < 5; i++) {
      const request = new Request('http://localhost/api/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': ip,
        },
        body: JSON.stringify({ name: `Party ${i + 1}` }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    }

    // 6th request should be rate limited
    const request = new Request('http://localhost/api/parties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify({ name: 'Party 6' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);

    const data = await response.json();
    expect(data.error).toContain('Too many parties');
    expect(response.headers.get('Retry-After')).toBeDefined();
  });

  it('allows different IPs to create parties independently', async () => {
    // Fill up rate limit for one IP
    for (let i = 0; i < 5; i++) {
      const request = new Request('http://localhost/api/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.0.0.1',
        },
        body: JSON.stringify({ name: `Party ${i + 1}` }),
      });
      await POST(request);
    }

    // Different IP should still work
    const request = new Request('http://localhost/api/parties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.2',
      },
      body: JSON.stringify({ name: 'Other IP Party' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});

describe('GET /api/parties/[hostCode]', () => {
  beforeEach(() => {
    setupTestDb();
  });

  it('returns full party data for a valid host code', async () => {
    const db = getTestDb();
    const party = await createTestParty(db, { name: 'Host Party' });

    const request = new Request(`http://localhost/api/parties/${party.hostCode}`, {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ hostCode: party.hostCode }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Host Party');
    expect(data.hostCode).toBe(party.hostCode);
    expect(data.guestCode).toBe(party.guestCode);
    expect(data.menuItems).toBeDefined();
    expect(data.locations).toBeDefined();
    expect(data.requests).toBeDefined();
  });

  it('returns 404 for an invalid host code', async () => {
    const request = new Request('http://localhost/api/parties/invalidcode', {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ hostCode: 'invalidcode' }) });
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toContain('not found');
  });
});

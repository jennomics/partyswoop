import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb, getTestDb } from '../helpers/setup';
import { createTestParty, addMenuItem, createTestRequest } from '../helpers/fixtures';
import { GET as getHostParty } from '@/app/api/parties/[hostCode]/route';
import { GET as getHostRequests } from '@/app/api/parties/[hostCode]/requests/route';
import { PATCH as patchRequest } from '@/app/api/parties/[hostCode]/requests/[requestId]/route';
import { GET as getGuestParty } from '@/app/api/party/[guestCode]/route';
import { POST as createGuestRequest } from '@/app/api/party/[guestCode]/requests/route';

describe('Party Expiry', () => {
  beforeEach(() => {
    setupTestDb();
  });

  function createExpiredParty() {
    const db = getTestDb();
    // Set expiry to 1 hour in the past
    const expiredAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    return createTestParty(db, { expiresAt: expiredAt });
  }

  it('GET /api/parties/[hostCode] returns 404 for expired party', async () => {
    const party = await createExpiredParty();

    const request = new Request(`http://localhost/api/parties/${party.hostCode}`, {
      method: 'GET',
    });

    const response = await getHostParty(request, {
      params: Promise.resolve({ hostCode: party.hostCode }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('expired');
  });

  it('GET /api/parties/[hostCode]/requests returns 404 for expired party', async () => {
    const party = await createExpiredParty();

    const request = new Request(`http://localhost/api/parties/${party.hostCode}/requests`, {
      method: 'GET',
    });

    const response = await getHostRequests(request, {
      params: Promise.resolve({ hostCode: party.hostCode }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('expired');
  });

  it('PATCH /api/parties/[hostCode]/requests/[requestId] returns 404 for expired party', async () => {
    const db = getTestDb();
    const party = await createExpiredParty();
    const req = await createTestRequest(db, party.id, {
      category: 'DRINK',
      item: 'Beer',
      status: 'NEW',
    });

    const request = new Request(
      `http://localhost/api/parties/${party.hostCode}/requests/${req.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SEEN' }),
      }
    );

    const response = await patchRequest(request, {
      params: Promise.resolve({ hostCode: party.hostCode, requestId: req.id }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('expired');
  });

  it('GET /api/party/[guestCode] returns 404 for expired party', async () => {
    const party = await createExpiredParty();

    const request = new Request(`http://localhost/api/party/${party.guestCode}`, {
      method: 'GET',
    });

    const response = await getGuestParty(request, {
      params: Promise.resolve({ guestCode: party.guestCode }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('expired');
  });

  it('POST /api/party/[guestCode]/requests returns 404 for expired party', async () => {
    const db = getTestDb();
    const party = await createExpiredParty();
    await addMenuItem(db, party.id, { name: 'Beer', category: 'DRINK' });

    const request = new Request(`http://localhost/api/party/${party.guestCode}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'DRINK',
        item: 'Beer',
        deliveryType: 'NAME',
        deliveryValue: 'Alice',
      }),
    });

    const response = await createGuestRequest(request, {
      params: Promise.resolve({ guestCode: party.guestCode }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('expired');
  });
});

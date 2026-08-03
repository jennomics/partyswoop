import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb, getTestDb } from '../helpers/setup';
import { createTestParty, addMenuItem, createTestRequest, addLocation } from '../helpers/fixtures';
import { POST } from '@/app/api/party/[guestCode]/requests/route';
import { PATCH } from '@/app/api/parties/[hostCode]/requests/[requestId]/route';
import { GET } from '@/app/api/parties/[hostCode]/requests/route';
import { menuItems } from '@/lib/schema';
import { eq } from 'drizzle-orm';

describe('POST /api/party/[guestCode]/requests', () => {
  beforeEach(() => {
    setupTestDb();
  });

  it('creates a DRINK request when item is on the menu', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
    await addMenuItem(db, party.id, { name: 'Cold Beer', category: 'DRINK', quantity: 10 });

    const request = new Request(`http://localhost/api/party/${party.guestCode}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'DRINK',
        item: 'Cold Beer',
        deliveryType: 'NAME',
        deliveryValue: 'Alice',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ guestCode: party.guestCode }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.category).toBe('DRINK');
    expect(data.item).toBe('Cold Beer');
    expect(data.status).toBe('NEW');
    expect(data.deliveryType).toBe('NAME');
    expect(data.deliveryValue).toBe('Alice');
  });

  it('returns 400 when drink item is not on the menu', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
    await addMenuItem(db, party.id, { name: 'Cold Beer', category: 'DRINK' });

    const request = new Request(`http://localhost/api/party/${party.guestCode}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'DRINK',
        item: 'Whiskey',
        deliveryType: 'NAME',
        deliveryValue: 'Bob',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ guestCode: party.guestCode }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not available');
  });

  it('creates a SUPPLY request successfully', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
    await addMenuItem(db, party.id, { name: 'Ice', category: 'SUPPLY' });

    const request = new Request(`http://localhost/api/party/${party.guestCode}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'SUPPLY',
        item: 'Ice',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ guestCode: party.guestCode }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.category).toBe('SUPPLY');
    expect(data.item).toBe('Ice');
  });

  it('creates a SONG request successfully', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);

    const request = new Request(`http://localhost/api/party/${party.guestCode}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'SONG',
        item: 'Bohemian Rhapsody',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ guestCode: party.guestCode }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.category).toBe('SONG');
    expect(data.item).toBe('Bohemian Rhapsody');
  });

  it('returns 400 for missing category', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);

    const request = new Request(`http://localhost/api/party/${party.guestCode}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item: 'Something',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ guestCode: party.guestCode }) });
    expect(response.status).toBe(400);
  });

  it('returns 404 for invalid guest code', async () => {
    const request = new Request('http://localhost/api/party/badcode/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'SONG',
        item: 'Test Song',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ guestCode: 'badcode' }) });
    expect(response.status).toBe(404);
  });

  it('creates a DRINK request with LOCATION delivery', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
    await addMenuItem(db, party.id, { name: 'Lager', category: 'DRINK' });
    const location = await addLocation(db, party.id, 'Pool Area');

    const request = new Request(`http://localhost/api/party/${party.guestCode}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'DRINK',
        item: 'Lager',
        deliveryType: 'LOCATION',
        deliveryValue: location.name,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ guestCode: party.guestCode }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.deliveryType).toBe('LOCATION');
    expect(data.locationId).toBe(location.id);
  });
});

describe('PATCH /api/parties/[hostCode]/requests/[requestId]', () => {
  beforeEach(() => {
    setupTestDb();
  });

  it('transitions status from NEW to SEEN', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
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

    const response = await PATCH(request, {
      params: Promise.resolve({ hostCode: party.hostCode, requestId: req.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('SEEN');
  });

  it('transitions status from SEEN to DONE', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
    const req = await createTestRequest(db, party.id, {
      category: 'SONG',
      item: 'Test Song',
      status: 'SEEN',
    });

    const request = new Request(
      `http://localhost/api/parties/${party.hostCode}/requests/${req.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DONE' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ hostCode: party.hostCode, requestId: req.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('DONE');
  });

  it('transitions status from NEW directly to DONE', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
    const req = await createTestRequest(db, party.id, {
      category: 'SONG',
      item: 'Quick Song',
      status: 'NEW',
    });

    const request = new Request(
      `http://localhost/api/parties/${party.hostCode}/requests/${req.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DONE' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ hostCode: party.hostCode, requestId: req.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('DONE');
  });

  it('rejects transition from DONE to NEW (backward not allowed)', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
    const req = await createTestRequest(db, party.id, {
      category: 'SONG',
      item: 'Done Song',
      status: 'DONE',
    });

    const request = new Request(
      `http://localhost/api/parties/${party.hostCode}/requests/${req.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'NEW' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ hostCode: party.hostCode, requestId: req.id }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Cannot transition');
  });

  it('rejects transition from DONE to SEEN (backward not allowed)', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
    const req = await createTestRequest(db, party.id, {
      category: 'DRINK',
      item: 'Done Drink',
      status: 'DONE',
    });

    const request = new Request(
      `http://localhost/api/parties/${party.hostCode}/requests/${req.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SEEN' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ hostCode: party.hostCode, requestId: req.id }),
    });

    expect(response.status).toBe(400);
  });

  it('decrements menu item quantity when DRINK request is marked DONE', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
    const item = await addMenuItem(db, party.id, {
      name: 'IPA',
      category: 'DRINK',
      quantity: 5,
    });
    const req = await createTestRequest(db, party.id, {
      category: 'DRINK',
      item: 'IPA',
      status: 'NEW',
      menuItemId: item.id,
    });

    const request = new Request(
      `http://localhost/api/parties/${party.hostCode}/requests/${req.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DONE' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ hostCode: party.hostCode, requestId: req.id }),
    });

    expect(response.status).toBe(200);

    // Verify inventory was decremented
    const [updatedItem] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, item.id));

    expect(updatedItem.quantity).toBe(4);
  });

  it('marks item unavailable when quantity reaches 0', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
    const item = await addMenuItem(db, party.id, {
      name: 'Last Soda',
      category: 'DRINK',
      quantity: 1,
    });
    const req = await createTestRequest(db, party.id, {
      category: 'DRINK',
      item: 'Last Soda',
      status: 'NEW',
      menuItemId: item.id,
    });

    const request = new Request(
      `http://localhost/api/parties/${party.hostCode}/requests/${req.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DONE' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ hostCode: party.hostCode, requestId: req.id }),
    });

    expect(response.status).toBe(200);

    // Verify item was marked unavailable
    const [updatedItem] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, item.id));

    expect(updatedItem.quantity).toBe(0);
    expect(updatedItem.available).toBe(false);
  });

  it('returns 404 for non-existent request', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);

    const request = new Request(
      `http://localhost/api/parties/${party.hostCode}/requests/nonexistent`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SEEN' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ hostCode: party.hostCode, requestId: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
  });

  it('returns 404 for invalid host code', async () => {
    const request = new Request(
      'http://localhost/api/parties/badcode/requests/someid',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SEEN' }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ hostCode: 'badcode', requestId: 'someid' }),
    });

    expect(response.status).toBe(404);
  });
});

describe('GET /api/parties/[hostCode]/requests', () => {
  beforeEach(() => {
    setupTestDb();
  });

  it('returns all requests for a party', async () => {
    const db = getTestDb();
    const party = await createTestParty(db);
    await createTestRequest(db, party.id, { category: 'DRINK', item: 'Beer' });
    await createTestRequest(db, party.id, { category: 'SONG', item: 'Wonderwall' });

    const request = new Request(
      `http://localhost/api/parties/${party.hostCode}/requests`,
      { method: 'GET' }
    );

    const response = await GET(request, { params: Promise.resolve({ hostCode: party.hostCode }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
  });

  it('returns 404 for invalid host code', async () => {
    const request = new Request(
      'http://localhost/api/parties/badcode/requests',
      { method: 'GET' }
    );

    const response = await GET(request, { params: Promise.resolve({ hostCode: 'badcode' }) });
    expect(response.status).toBe(404);
  });
});

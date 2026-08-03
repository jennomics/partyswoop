import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb, getTestDb } from '../helpers/setup';
import { createTestParty, addMenuItem } from '../helpers/fixtures';
import { POST as createParty } from '@/app/api/parties/route';
import { POST as createRequest } from '@/app/api/party/[guestCode]/requests/route';

describe('Rate Limiting', () => {
  beforeEach(() => {
    setupTestDb();
  });

  describe('Party creation - 5 per hour per IP', () => {
    it('allows up to 5 party creations per IP', async () => {
      const ip = '203.0.113.1';

      for (let i = 0; i < 5; i++) {
        const request = new Request('http://localhost/api/parties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify({ name: `Party ${i + 1}` }),
        });

        const response = await createParty(request);
        expect(response.status).toBe(201);
      }
    });

    it('blocks the 6th party creation within the hour', async () => {
      const ip = '203.0.113.2';

      for (let i = 0; i < 5; i++) {
        const request = new Request('http://localhost/api/parties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify({ name: `Party ${i + 1}` }),
        });
        await createParty(request);
      }

      const request = new Request('http://localhost/api/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': ip,
        },
        body: JSON.stringify({ name: 'Too Many' }),
      });

      const response = await createParty(request);
      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('uses cf-connecting-ip header when available', async () => {
      const cfIp = '198.51.100.1';

      // Fill up rate limit using cf-connecting-ip
      for (let i = 0; i < 5; i++) {
        const request = new Request('http://localhost/api/parties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'cf-connecting-ip': cfIp,
            'x-forwarded-for': '10.0.0.1', // should be ignored
          },
          body: JSON.stringify({ name: `Party ${i + 1}` }),
        });
        await createParty(request);
      }

      // 6th should be blocked
      const request = new Request('http://localhost/api/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': cfIp,
        },
        body: JSON.stringify({ name: 'Blocked' }),
      });

      const response = await createParty(request);
      expect(response.status).toBe(429);
    });
  });

  describe('Guest request submission - 20 per minute per party', () => {
    it('allows up to 20 requests per minute per party', async () => {
      const db = getTestDb();
      const party = await createTestParty(db);
      await addMenuItem(db, party.id, { name: 'Beer', category: 'DRINK' });

      for (let i = 0; i < 20; i++) {
        const request = new Request(`http://localhost/api/party/${party.guestCode}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'DRINK',
            item: 'Beer',
            deliveryType: 'NAME',
            deliveryValue: `Guest ${i}`,
          }),
        });

        const response = await createRequest(request, {
          params: Promise.resolve({ guestCode: party.guestCode }),
        });
        expect(response.status).toBe(201);
      }
    });

    it('blocks the 21st request within the minute', async () => {
      const db = getTestDb();
      const party = await createTestParty(db);
      await addMenuItem(db, party.id, { name: 'Beer', category: 'DRINK' });

      // Submit 20 requests
      for (let i = 0; i < 20; i++) {
        const request = new Request(`http://localhost/api/party/${party.guestCode}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'DRINK',
            item: 'Beer',
            deliveryType: 'NAME',
            deliveryValue: `Guest ${i}`,
          }),
        });
        await createRequest(request, {
          params: Promise.resolve({ guestCode: party.guestCode }),
        });
      }

      // 21st should be rate limited
      const request = new Request(`http://localhost/api/party/${party.guestCode}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'DRINK',
          item: 'Beer',
          deliveryType: 'NAME',
          deliveryValue: 'Blocked Guest',
        }),
      });

      const response = await createRequest(request, {
        params: Promise.resolve({ guestCode: party.guestCode }),
      });
      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error).toContain('Too many requests');
    });

    it('rate limit is per-party, not global', async () => {
      const db = getTestDb();
      const party1 = await createTestParty(db, { name: 'Party 1' });
      const party2 = await createTestParty(db, { name: 'Party 2' });
      await addMenuItem(db, party1.id, { name: 'Beer', category: 'DRINK' });
      await addMenuItem(db, party2.id, { name: 'Beer', category: 'DRINK' });

      // Fill up rate limit for party1
      for (let i = 0; i < 20; i++) {
        const request = new Request(`http://localhost/api/party/${party1.guestCode}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'DRINK',
            item: 'Beer',
            deliveryType: 'NAME',
            deliveryValue: `Guest ${i}`,
          }),
        });
        await createRequest(request, {
          params: Promise.resolve({ guestCode: party1.guestCode }),
        });
      }

      // Party2 should still accept requests
      const request = new Request(`http://localhost/api/party/${party2.guestCode}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'DRINK',
          item: 'Beer',
          deliveryType: 'NAME',
          deliveryValue: 'Still Works',
        }),
      });

      const response = await createRequest(request, {
        params: Promise.resolve({ guestCode: party2.guestCode }),
      });
      expect(response.status).toBe(201);
    });
  });
});

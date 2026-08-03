import { vi } from 'vitest';
import { createTestDb, type TestDatabase } from './db';

let testDb: TestDatabase;

/**
 * Sets up the test database and mocks for API route testing.
 * Call this in beforeEach to get a fresh database for each test.
 */
export function setupTestDb(): TestDatabase {
  testDb = createTestDb();
  return testDb;
}

/**
 * Returns the current test database instance.
 */
export function getTestDb(): TestDatabase {
  return testDb;
}

// Mock the @/lib/db module so that getDb() returns our test database
vi.mock('@/lib/db', () => ({
  getDb: () => {
    if (!testDb) {
      throw new Error('Test database not initialized. Call setupTestDb() in beforeEach.');
    }
    return testDb;
  },
}));

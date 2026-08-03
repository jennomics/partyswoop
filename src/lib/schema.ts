import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// --- Tables ---

export const parties = sqliteTable('parties', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  guestCode: text('guest_code').notNull().unique(),
  hostCode: text('host_code').notNull().unique(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  expiresAt: text('expires_at').notNull(),
});

export const menuItems = sqliteTable(
  'menu_items',
  {
    id: text('id').primaryKey(),
    partyId: text('party_id')
      .notNull()
      .references(() => parties.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    available: integer('available', { mode: 'boolean' }).notNull().default(true),
    category: text('category').notNull(),
    quantity: integer('quantity'),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(3),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index('menu_items_party_id_idx').on(table.partyId)]
);

export const locations = sqliteTable(
  'locations',
  {
    id: text('id').primaryKey(),
    partyId: text('party_id')
      .notNull()
      .references(() => parties.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code').notNull().unique(),
  },
  (table) => [index('locations_party_id_idx').on(table.partyId)]
);

export const requests = sqliteTable(
  'requests',
  {
    id: text('id').primaryKey(),
    partyId: text('party_id')
      .notNull()
      .references(() => parties.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    item: text('item').notNull(),
    note: text('note'),
    deliveryType: text('delivery_type').notNull(),
    deliveryValue: text('delivery_value').notNull(),
    status: text('status').notNull().default('NEW'),
    locationId: text('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    menuItemId: text('menu_item_id').references(() => menuItems.id, {
      onDelete: 'set null',
    }),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('requests_party_id_idx').on(table.partyId),
    index('requests_location_id_idx').on(table.locationId),
  ]
);

export const rateLimits = sqliteTable(
  'rate_limits',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    window: text('window').notNull(),
    count: integer('count').notNull().default(1),
    expiresAt: text('expires_at').notNull(),
  },
  (table) => [index('rate_limits_key_window_idx').on(table.key, table.window)]
);

// --- Relations ---

export const partiesRelations = relations(parties, ({ many }) => ({
  menuItems: many(menuItems),
  locations: many(locations),
  requests: many(requests),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  party: one(parties, {
    fields: [menuItems.partyId],
    references: [parties.id],
  }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  party: one(parties, {
    fields: [locations.partyId],
    references: [parties.id],
  }),
  requests: many(requests),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  party: one(parties, {
    fields: [requests.partyId],
    references: [parties.id],
  }),
  location: one(locations, {
    fields: [requests.locationId],
    references: [locations.id],
  }),
  menuItem: one(menuItems, {
    fields: [requests.menuItemId],
    references: [menuItems.id],
  }),
}));

// --- Type Exports ---

export type Party = typeof parties.$inferSelect;
export type NewParty = typeof parties.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type RequestRecord = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;

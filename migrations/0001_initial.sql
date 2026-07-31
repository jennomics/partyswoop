CREATE TABLE `parties` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `guest_code` text NOT NULL,
  `host_code` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `expires_at` text NOT NULL
);

CREATE UNIQUE INDEX `parties_guest_code_unique` ON `parties` (`guest_code`);
CREATE UNIQUE INDEX `parties_host_code_unique` ON `parties` (`host_code`);

CREATE TABLE `menu_items` (
  `id` text PRIMARY KEY NOT NULL,
  `party_id` text NOT NULL REFERENCES `parties`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `available` integer NOT NULL DEFAULT 1,
  `category` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX `menu_items_party_id_idx` ON `menu_items` (`party_id`);

CREATE TABLE `locations` (
  `id` text PRIMARY KEY NOT NULL,
  `party_id` text NOT NULL REFERENCES `parties`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `code` text NOT NULL
);

CREATE UNIQUE INDEX `locations_code_unique` ON `locations` (`code`);
CREATE INDEX `locations_party_id_idx` ON `locations` (`party_id`);

CREATE TABLE `requests` (
  `id` text PRIMARY KEY NOT NULL,
  `party_id` text NOT NULL REFERENCES `parties`(`id`) ON DELETE CASCADE,
  `category` text NOT NULL,
  `item` text NOT NULL,
  `note` text,
  `delivery_type` text NOT NULL,
  `delivery_value` text NOT NULL,
  `status` text NOT NULL DEFAULT 'NEW',
  `location_id` text REFERENCES `locations`(`id`) ON DELETE SET NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX `requests_party_id_idx` ON `requests` (`party_id`);
CREATE INDEX `requests_location_id_idx` ON `requests` (`location_id`);

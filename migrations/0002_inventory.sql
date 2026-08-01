ALTER TABLE `menu_items` ADD COLUMN `quantity` integer;
ALTER TABLE `menu_items` ADD COLUMN `low_stock_threshold` integer NOT NULL DEFAULT 3;

-- Rate limits table for D1-backed rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  window TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_key_window_idx ON rate_limits (key, window);

-- Add menu_item_id to requests for direct inventory lookup
ALTER TABLE requests ADD COLUMN menu_item_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL;

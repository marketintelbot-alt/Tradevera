CREATE TABLE IF NOT EXISTS risk_settings (
  user_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  daily_max_loss REAL,
  max_consecutive_losses INTEGER,
  cooldown_minutes INTEGER NOT NULL DEFAULT 45,
  lockout_until TEXT,
  last_trigger_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS trade_screenshots (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  image_data TEXT NOT NULL,
  caption TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (trade_id) REFERENCES trades(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS risk_settings_user_id ON risk_settings(user_id);
CREATE INDEX IF NOT EXISTS trade_screenshots_trade_id_created_at ON trade_screenshots(trade_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trade_screenshots_user_id ON trade_screenshots(user_id);

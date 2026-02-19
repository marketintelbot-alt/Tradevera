CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL,
  session_version INTEGER NOT NULL DEFAULT 1,
  pro_welcome_sent_at TEXT
);

CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  price_id TEXT NOT NULL,
  current_period_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  symbol TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price REAL NOT NULL,
  exit_price REAL,
  size REAL NOT NULL,
  fees REAL NOT NULL DEFAULT 0,
  pnl REAL,
  r_multiple REAL,
  setup TEXT,
  timeframe TEXT,
  session TEXT,
  confidence INTEGER,
  plan_adherence INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  mistakes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS trades_user_id_opened_at ON trades(user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS trades_user_id_symbol ON trades(user_id, symbol);
CREATE INDEX IF NOT EXISTS login_tokens_user_email ON login_tokens(user_email);
CREATE INDEX IF NOT EXISTS subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_customer_id ON subscriptions(customer_id);

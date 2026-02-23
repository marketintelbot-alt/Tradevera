CREATE TABLE IF NOT EXISTS prop_firm_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  custom_platform_name TEXT,
  account_size TEXT NOT NULL DEFAULT 'custom',
  is_copy_trading INTEGER NOT NULL DEFAULT 0,
  copy_group_key TEXT,
  copy_group_name TEXT,
  is_group_leader INTEGER NOT NULL DEFAULT 0,
  profit_target REAL,
  max_position_size REAL,
  daily_loss_limit REAL,
  max_drawdown REAL,
  drawdown_mode TEXT NOT NULL DEFAULT 'fixed',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS prop_firm_accounts_user_id_updated_at
  ON prop_firm_accounts(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS prop_firm_accounts_user_id_copy_group
  ON prop_firm_accounts(user_id, copy_group_key);

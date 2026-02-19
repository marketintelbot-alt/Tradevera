INSERT OR IGNORE INTO users (id, email, plan, created_at, session_version, pro_welcome_sent_at)
VALUES ('11111111-1111-4111-8111-111111111111', 'demo@tradevera.app', 'pro', datetime('now'), 1, datetime('now'));

INSERT OR REPLACE INTO trades (
  id,
  user_id,
  opened_at,
  closed_at,
  symbol,
  asset_class,
  direction,
  entry_price,
  exit_price,
  size,
  fees,
  pnl,
  r_multiple,
  setup,
  timeframe,
  session,
  confidence,
  plan_adherence,
  notes,
  mistakes,
  created_at,
  updated_at
)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    datetime('now', '-1 day'),
    datetime('now', '-1 day', '+2 hour'),
    'AAPL',
    'stocks',
    'long',
    186.50,
    189.20,
    100,
    2.5,
    267.5,
    1.8,
    'Breakout continuation',
    '15m',
    'NY',
    82,
    1,
    'Clean breakout above VWAP with high relative volume.',
    'None',
    datetime('now'),
    datetime('now')
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    datetime('now', '-2 day'),
    datetime('now', '-2 day', '+1 hour'),
    'NQ',
    'futures',
    'short',
    18234.0,
    18195.0,
    1,
    4.0,
    35.0,
    1.2,
    'Opening range failure',
    '5m',
    'London',
    74,
    1,
    'Followed plan and respected stop.',
    'Late entry',
    datetime('now'),
    datetime('now')
  );

INSERT OR REPLACE INTO projects (
  id,
  user_id,
  name,
  description,
  color,
  status,
  created_at,
  updated_at
)
VALUES
  (
    '30000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'Q1 Execution Sprint',
    'Build consistent A+ setup execution and reduce avoidable errors.',
    '#2CD5A4',
    'active',
    datetime('now'),
    datetime('now')
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'Playbook Refinement',
    'Refactor setup definitions and improve checklist quality.',
    '#F2B84B',
    'active',
    datetime('now'),
    datetime('now')
  );

INSERT OR REPLACE INTO tasks (
  id,
  user_id,
  project_id,
  title,
  details,
  status,
  priority,
  due_at,
  completed_at,
  estimate_minutes,
  created_at,
  updated_at
)
VALUES
  (
    '40000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '30000000-0000-4000-8000-000000000001',
    'Record pre-market checklist before open',
    'Must include primary setup, invalidation, and max risk.',
    'in_progress',
    'high',
    datetime('now', '+1 day'),
    NULL,
    20,
    datetime('now'),
    datetime('now')
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '30000000-0000-4000-8000-000000000002',
    'Review all late-entry losses',
    'Tag root cause and define one fix per trade.',
    'todo',
    'medium',
    datetime('now', '+2 day'),
    NULL,
    35,
    datetime('now'),
    datetime('now')
  );

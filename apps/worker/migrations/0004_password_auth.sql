ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_updated_at TEXT;

CREATE INDEX IF NOT EXISTS users_email_password_hash ON users(email, password_hash);

-- PostgreSQL version of SummitDB schema
-- Run:
--   psql -d <db> -f backend/schema/SummitDB_postgres.sql

-- Create enum types (mirrors the MySQL ENUM values)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_doc_type') THEN
    CREATE TYPE user_doc_type AS ENUM ('passport','stateid','driverslicense');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM ('checking','savings');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('active','inactive','closed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_type') THEN
    CREATE TYPE card_type AS ENUM ('debit','credit');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_network') THEN
    CREATE TYPE card_network AS ENUM ('visa','mastercard','amex','discover');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_status') THEN
    CREATE TYPE card_status AS ENUM ('active','blocked','pending','expired');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'txn_type') THEN
    CREATE TYPE txn_type AS ENUM ('transfer','credit','debit','payment');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'txn_status') THEN
    CREATE TYPE txn_status AS ENUM ('completed','pending','failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notif_doc_type') THEN
    -- not used; kept for safety
    NULL;
  END IF;
END$$;

-- Core tables
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  street VARCHAR(255) NOT NULL DEFAULT '',
  apartment VARCHAR(100),
  city VARCHAR(100) NOT NULL DEFAULT '',
  state VARCHAR(100) NOT NULL DEFAULT '',
  zip VARCHAR(30) NOT NULL DEFAULT '',
  country VARCHAR(2) NOT NULL DEFAULT 'US',
  occupation VARCHAR(100) NOT NULL DEFAULT '',
  employer VARCHAR(150),
  income_range VARCHAR(100) NOT NULL DEFAULT '',
  source_of_funds VARCHAR(100) NOT NULL DEFAULT '',
  ssn_encrypted BYTEA,
  doc_type user_doc_type NOT NULL DEFAULT 'passport',
  pin_hash VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE TABLE IF NOT EXISTS accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_number VARCHAR(50) NOT NULL UNIQUE,
  account_type account_type NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  routing_number VARCHAR(50),
  apy DECIMAL(7,4),
  status account_status NOT NULL DEFAULT 'active',
  opened_at DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

CREATE TABLE IF NOT EXISTS cards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  card_type card_type NOT NULL,
  card_network card_network NOT NULL DEFAULT 'visa',
  last4 VARCHAR(4) NOT NULL,
  expiry_month INT NOT NULL,
  expiry_year INT NOT NULL,
  cardholder_name VARCHAR(200) NOT NULL,
  status card_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id VARCHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  amount DECIMAL(18,2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  type txn_type NOT NULL,
  balance_after DECIMAL(18,2),
  status txn_status NOT NULL DEFAULT 'completed',
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT '',
  description VARCHAR(255) NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- Session support + password reset used by authController.js
CREATE TABLE IF NOT EXISTS password_resets (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(200) NOT NULL DEFAULT '',
  location VARCHAR(200) NOT NULL DEFAULT '',
  ip_address VARCHAR(64) NOT NULL DEFAULT '',
  user_agent VARCHAR(300),
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP,
  created_token VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);


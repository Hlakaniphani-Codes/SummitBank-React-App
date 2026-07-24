-- ============================================================
-- SUMMIT SHARES - UNIFIED DATABASE SCHEMA
-- Run: psql -d <db> -f unified_schema.sql
-- ============================================================

-- ============================================================
-- 1. ENUM TYPES (All enums from all migrations)
-- ============================================================

-- User document types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_doc_type') THEN
    CREATE TYPE user_doc_type AS ENUM ('passport','stateid','driverslicense');
  END IF;
END$$;

-- Account types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM ('checking','savings');
  END IF;
END$$;

-- Account status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('active','inactive','closed','frozen');
  END IF;
END$$;

-- Card types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_type') THEN
    CREATE TYPE card_type AS ENUM ('debit','credit');
  END IF;
END$$;

-- Card networks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_network') THEN
    CREATE TYPE card_network AS ENUM ('visa','mastercard','amex','discover');
  END IF;
END$$;

-- Card status (includes 'cancelled')
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_status') THEN
    CREATE TYPE card_status AS ENUM ('active','blocked','pending','expired','cancelled');
  END IF;
END$$;

-- Transaction types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'txn_type') THEN
    CREATE TYPE txn_type AS ENUM ('transfer','credit','debit','payment');
  END IF;
END$$;

-- Transaction status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'txn_status') THEN
    CREATE TYPE txn_status AS ENUM ('completed','pending','failed');
  END IF;
END$$;

-- Bill frequency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_frequency') THEN
    CREATE TYPE bill_frequency AS ENUM ('one-time','monthly','quarterly','yearly');
  END IF;
END$$;

-- Bill status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_status') THEN
    CREATE TYPE bill_status AS ENUM ('upcoming','due','paid','cancelled');
  END IF;
END$$;

-- Invoice payment status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_payment_status') THEN
    CREATE TYPE invoice_payment_status AS ENUM ('completed','pending','failed');
  END IF;
END$$;

-- Document type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM ('statement','tax');
  END IF;
END$$;

-- User role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('customer', 'admin', 'super_admin');
  END IF;
END$$;

-- Application status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected', 'review');
  END IF;
END$$;

-- Application type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_type') THEN
    CREATE TYPE application_type AS ENUM ('account', 'card', 'loan', 'wire_transfer', 'other');
  END IF;
END$$;

-- Wire/Transfer status (includes 'completed')
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wire_status') THEN
    CREATE TYPE wire_status AS ENUM ('pending', 'approved', 'sent', 'blocked', 'hold', 'failed', 'completed');
  END IF;
END$$;

-- Login status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'login_status') THEN
    CREATE TYPE login_status AS ENUM ('success', 'failed', 'locked');
  END IF;
END$$;

-- Cheque deposit status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cheque_status') THEN
    CREATE TYPE cheque_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END$$;

-- Support ticket status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
  END IF;
END$$;

-- ============================================================
-- 2. CORE TABLES
-- ============================================================

-- 2.1 Users (includes all columns from migrations)
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
  role user_role NOT NULL DEFAULT 'customer',
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  login_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_login_enabled ON users(login_enabled);

-- 2.2 Accounts
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
CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- 2.3 Cards (includes is_visible)
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
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);

-- 2.4 Transactions
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
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);

-- 2.5 Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT '',
  description VARCHAR(255) NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read);

-- 2.6 Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- 2.7 User Sessions
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

-- ============================================================
-- 3. FEATURE TABLES
-- ============================================================

-- 3.1 Beneficiaries
CREATE TABLE IF NOT EXISTS beneficiaries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  bank_name VARCHAR(200) NOT NULL DEFAULT '',
  account_identifier VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_user ON beneficiaries(user_id);

-- 3.2 Payees
CREATE TABLE IF NOT EXISTS payees (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  account_identifier VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payees_user ON payees(user_id);

-- 3.3 Bills
CREATE TABLE IF NOT EXISTS bills (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payee_id BIGINT REFERENCES payees(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL,
  frequency bill_frequency NOT NULL DEFAULT 'one-time',
  status bill_status NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_payee ON bills(payee_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

-- 3.4 Invoice Payments
CREATE TABLE IF NOT EXISTS invoice_payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id BIGINT REFERENCES bills(id) ON DELETE SET NULL,
  payee_id BIGINT REFERENCES payees(id) ON DELETE SET NULL,
  transaction_id VARCHAR(64),
  amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  description VARCHAR(255) NOT NULL DEFAULT '',
  status invoice_payment_status NOT NULL DEFAULT 'completed',
  payment_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_user ON invoice_payments(user_id);

-- 3.5 Documents
CREATE TABLE IF NOT EXISTS documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type document_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  period_start DATE,
  period_end DATE,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  file_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);

-- ============================================================
-- 4. ADMIN TABLES
-- ============================================================

-- 4.1 Applications
CREATE TABLE IF NOT EXISTS applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_type application_type NOT NULL DEFAULT 'account',
  status application_status NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(application_type);

-- 4.2 Wire Transfers
CREATE TABLE IF NOT EXISTS wire_transfers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  beneficiary_name VARCHAR(200) NOT NULL,
  beneficiary_bank VARCHAR(200) NOT NULL,
  beneficiary_account VARCHAR(100) NOT NULL,
  beneficiary_routing VARCHAR(100) DEFAULT '',
  beneficiary_address VARCHAR(300) DEFAULT '',
  swift_code VARCHAR(20) DEFAULT '',
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  fee DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  description VARCHAR(500) DEFAULT '',
  status wire_status NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  error_message VARCHAR(500) DEFAULT '',
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wire_transfers_user ON wire_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_status ON wire_transfers(status);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_created ON wire_transfers(created_at DESC);

-- 4.3 Audit Logs (action is VARCHAR to allow any value)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT,
  description VARCHAR(500) DEFAULT '',
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(64) DEFAULT '',
  user_agent VARCHAR(300) DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- 4.4 Login History
CREATE TABLE IF NOT EXISTS login_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status login_status NOT NULL,
  ip_address VARCHAR(64) DEFAULT '',
  user_agent VARCHAR(300) DEFAULT '',
  device_name VARCHAR(200) DEFAULT '',
  location VARCHAR(200) DEFAULT '',
  failure_reason VARCHAR(200) DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at DESC);

-- 4.5 Deposited Cheques
CREATE TABLE IF NOT EXISTS deposited_cheques (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount DECIMAL(18,2) NOT NULL,
  bank_name VARCHAR(200) DEFAULT '',
  cheque_number VARCHAR(50) DEFAULT '',
  front_image_url VARCHAR(500) DEFAULT '',
  back_image_url VARCHAR(500) DEFAULT '',
  status cheque_status NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deposited_cheques_user ON deposited_cheques(user_id);
CREATE INDEX IF NOT EXISTS idx_deposited_cheques_status ON deposited_cheques(status);

-- 4.6 Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- 4.7 AI Conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON ai_conversations(created_at DESC);

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_applications_updated_at') THEN
    CREATE TRIGGER update_applications_updated_at
      BEFORE UPDATE ON applications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wire_transfers_updated_at') THEN
    CREATE TRIGGER update_wire_transfers_updated_at
      BEFORE UPDATE ON wire_transfers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_deposited_cheques_updated_at') THEN
    CREATE TRIGGER update_deposited_cheques_updated_at
      BEFORE UPDATE ON deposited_cheques
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_support_tickets_updated_at') THEN
    CREATE TRIGGER update_support_tickets_updated_at
      BEFORE UPDATE ON support_tickets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- ============================================================
-- 6. SEED DATA (Admin User)
-- ============================================================

DO $$
DECLARE
  admin_id BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@summitshares.com') THEN
    INSERT INTO users (
      first_name, last_name, email, phone, password_hash, pin_hash,
      role, is_active, terms_accepted, email_verified,
      street, city, state, zip, country, occupation, doc_type,
      status, login_enabled
    ) VALUES (
      'System',
      'Administrator',
      'admin@summitshares.com',
      '+1 (276) 257-6174',
      '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9Rn6dHG0GqfQuXfqVhqFxqXKwu', -- Admin@123456
      '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9Rn6dHG0GqfQuXfqVhqFxqXKwu',
      'super_admin',
      TRUE, TRUE, TRUE,
      '301 East Water Street',
      'Charlottesville',
      'VA',
      '22904',
      'US',
      'System Administrator',
      'passport',
      'approved',
      TRUE
    )
    RETURNING id INTO admin_id;

    RAISE NOTICE 'Admin user created with id: %', admin_id;
  END IF;
END$$;
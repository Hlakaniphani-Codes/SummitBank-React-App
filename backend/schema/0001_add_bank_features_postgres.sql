-- PostgreSQL version of backend/schema/0001_add_bank_features.sql

-- Extra ENUM types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_frequency') THEN
    CREATE TYPE bill_frequency AS ENUM ('one-time','monthly','quarterly','yearly');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_status') THEN
    CREATE TYPE bill_status AS ENUM ('upcoming','due','paid','cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_payment_status') THEN
    CREATE TYPE invoice_payment_status AS ENUM ('completed','pending','failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM ('statement','tax');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS beneficiaries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  bank_name VARCHAR(200) NOT NULL DEFAULT '',
  account_identifier VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_user ON beneficiaries(user_id);

CREATE TABLE IF NOT EXISTS payees (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  account_identifier VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payees_user ON payees(user_id);

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


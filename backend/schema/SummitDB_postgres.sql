-- ============================================================
-- SUMMITFIN - Complete Database Schema
-- PostgreSQL
-- ============================================================

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================
DO $$ 
BEGIN
  -- User role enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('customer', 'admin', 'super_admin');
  END IF;

  -- Account status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('active', 'inactive', 'frozen', 'closed');
  END IF;

  -- Account type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM ('checking', 'savings', 'money_market', 'cd', 'investment');
  END IF;

  -- Application status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected', 'review');
  END IF;

  -- Application type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_type') THEN
    CREATE TYPE application_type AS ENUM ('account', 'card', 'loan', 'wire_transfer', 'other');
  END IF;

  -- Wire status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wire_status') THEN
    CREATE TYPE wire_status AS ENUM ('pending', 'approved', 'sent', 'blocked', 'hold', 'failed');
  END IF;

  -- Audit action enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE audit_action AS ENUM (
      'login', 'logout', 'create', 'update', 'delete', 'approve', 'reject',
      'credit', 'debit', 'hold', 'unhold', 'activate', 'deactivate',
      'hide', 'show', 'block', 'send_email', 'broadcast', 'send_popup',
      'mark_sent', 'error_message', 'view'
    );
  END IF;

  -- Login status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'login_status') THEN
    CREATE TYPE login_status AS ENUM ('success', 'failed', 'locked');
  END IF;

  -- Card network enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_network') THEN
    CREATE TYPE card_network AS ENUM ('visa', 'mastercard', 'amex', 'discover');
  END IF;

  -- Card type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_type') THEN
    CREATE TYPE card_type AS ENUM ('debit', 'credit', 'prepaid');
  END IF;

  -- Card status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_status') THEN
    CREATE TYPE card_status AS ENUM ('active', 'inactive', 'frozen', 'closed', 'pending');
  END IF;

  -- Transaction type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer', 'payment', 'fee', 'interest');
  END IF;

  -- Transaction status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
  END IF;

  -- Bill frequency enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_frequency') THEN
    CREATE TYPE bill_frequency AS ENUM ('one_time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');
  END IF;

  -- Bill status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_status') THEN
    CREATE TYPE bill_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
  END IF;

  -- Invoice payment status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_payment_status') THEN
    CREATE TYPE invoice_payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled', 'completed');
  END IF;

  -- Document type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_type') THEN
    CREATE TYPE doc_type AS ENUM ('passport', 'drivers_license', 'id_card', 'utility_bill', 'bank_statement', 'tax_return');
  END IF;

  -- Ticket status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
  END IF;
END $$;

-- ============================================================
-- 2. USERS TABLE
-- ============================================================
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE,
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    login_enabled BOOLEAN DEFAULT TRUE,
    terms_accepted BOOLEAN DEFAULT FALSE,
    role user_role DEFAULT 'customer',
    
    -- Address fields
    street VARCHAR(255) NOT NULL,
    apartment VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    
    -- Employment fields
    occupation VARCHAR(100) NOT NULL,
    employer VARCHAR(100),
    income_range VARCHAR(50) NOT NULL,
    source_of_funds VARCHAR(100) NOT NULL,
    
    -- Document fields
    doc_type doc_type NOT NULL,
    ssn_encrypted BYTEA,
    
    -- Credit fields
    credit_score INTEGER,
    
    -- Status fields
    status VARCHAR(50),
    rejected_reason TEXT,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    
    -- Tracking fields
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================
-- 3. ACCOUNTS TABLE
-- ============================================================
DROP TABLE IF EXISTS accounts CASCADE;
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(50) NOT NULL UNIQUE,
    routing_number VARCHAR(50),
    account_type account_type NOT NULL,
    status account_status NOT NULL DEFAULT 'active',
    balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    apy DECIMAL(5,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_account_number ON accounts(account_number);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_type ON accounts(account_type);

-- ============================================================
-- 4. CARDS TABLE
-- ============================================================
DROP TABLE IF EXISTS cards CASCADE;
CREATE TABLE cards (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    cardholder_name VARCHAR(100) NOT NULL,
    card_type card_type NOT NULL,
    card_network card_network NOT NULL,
    last4 VARCHAR(4) NOT NULL,
    expiry_month INTEGER NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year INTEGER NOT NULL,
    status card_status NOT NULL DEFAULT 'active',
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_account_id ON cards(account_id);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_last4 ON cards(last4);

-- ============================================================
-- 5. TRANSACTIONS TABLE
-- ============================================================
DROP TABLE IF EXISTS transactions CASCADE;
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    amount DECIMAL(18,2) NOT NULL,
    type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    description VARCHAR(500) NOT NULL,
    balance_after DECIMAL(18,2),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- ============================================================
-- 6. BENEFICIARIES TABLE
-- ============================================================
DROP TABLE IF EXISTS beneficiaries CASCADE;
CREATE TABLE beneficiaries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_identifier VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_beneficiaries_user_id ON beneficiaries(user_id);
CREATE INDEX idx_beneficiaries_name ON beneficiaries(name);

-- ============================================================
-- 7. PAYEES TABLE
-- ============================================================
DROP TABLE IF EXISTS payees CASCADE;
CREATE TABLE payees (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    account_identifier VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payees_user_id ON payees(user_id);
CREATE INDEX idx_payees_name ON payees(name);
CREATE INDEX idx_payees_category ON payees(category);

-- ============================================================
-- 8. BILLS TABLE
-- ============================================================
DROP TABLE IF EXISTS bills CASCADE;
CREATE TABLE bills (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payee_id BIGINT REFERENCES payees(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    due_date DATE NOT NULL,
    frequency bill_frequency NOT NULL,
    status bill_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_bills_payee_id ON bills(payee_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_due_date ON bills(due_date);

-- ============================================================
-- 9. INVOICE_PAYMENTS TABLE
-- ============================================================
DROP TABLE IF EXISTS invoice_payments CASCADE;
CREATE TABLE invoice_payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bill_id BIGINT REFERENCES bills(id) ON DELETE SET NULL,
    payee_id BIGINT REFERENCES payees(id) ON DELETE SET NULL,
    amount DECIMAL(18,2) NOT NULL,
    description VARCHAR(500) NOT NULL,
    payment_date DATE NOT NULL,
    transaction_id VARCHAR(100),
    status invoice_payment_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_payments_user_id ON invoice_payments(user_id);
CREATE INDEX idx_invoice_payments_bill_id ON invoice_payments(bill_id);
CREATE INDEX idx_invoice_payments_status ON invoice_payments(status);
CREATE INDEX idx_invoice_payments_payment_date ON invoice_payments(payment_date);

-- ============================================================
-- 10. WIRE_TRANSFERS TABLE
-- ============================================================
DROP TABLE IF EXISTS wire_transfers CASCADE;
CREATE TABLE wire_transfers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    beneficiary_name VARCHAR(200) NOT NULL,
    beneficiary_bank VARCHAR(200) NOT NULL,
    beneficiary_account VARCHAR(100) NOT NULL,
    beneficiary_routing VARCHAR(100),
    beneficiary_address VARCHAR(300),
    swift_code VARCHAR(20),
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    fee DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    description VARCHAR(500),
    status wire_status NOT NULL DEFAULT 'pending',
    reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    error_message VARCHAR(500),
    is_sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wire_transfers_user_id ON wire_transfers(user_id);
CREATE INDEX idx_wire_transfers_account_id ON wire_transfers(from_account_id);
CREATE INDEX idx_wire_transfers_status ON wire_transfers(status);
CREATE INDEX idx_wire_transfers_created_at ON wire_transfers(created_at);

-- ============================================================
-- 11. APPLICATIONS TABLE
-- ============================================================
DROP TABLE IF EXISTS applications CASCADE;
CREATE TABLE applications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_type application_type NOT NULL,
    status application_status NOT NULL DEFAULT 'pending',
    reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_type ON applications(application_type);

-- ============================================================
-- 12. DEPOSITED_CHEQUES TABLE
-- ============================================================
DROP TABLE IF EXISTS deposited_cheques CASCADE;
CREATE TABLE deposited_cheques (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount DECIMAL(18,2) NOT NULL,
    bank_name VARCHAR(200),
    cheque_number VARCHAR(50),
    front_image_url VARCHAR(500),
    back_image_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deposited_cheques_user_id ON deposited_cheques(user_id);
CREATE INDEX idx_deposited_cheques_account_id ON deposited_cheques(account_id);
CREATE INDEX idx_deposited_cheques_status ON deposited_cheques(status);

-- ============================================================
-- 13. AI_CONVERSATIONS TABLE
-- ============================================================
DROP TABLE IF EXISTS ai_conversations CASCADE;
CREATE TABLE ai_conversations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at);

-- ============================================================
-- 14. NOTIFICATIONS TABLE
-- ============================================================
DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(500) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================================
-- 15. USER_SESSIONS TABLE
-- ============================================================
DROP TABLE IF EXISTS user_sessions CASCADE;
CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    location VARCHAR(200) NOT NULL,
    user_agent VARCHAR(300),
    created_token VARCHAR(255),
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_is_current ON user_sessions(is_current);
CREATE INDEX idx_user_sessions_created_at ON user_sessions(created_at);

-- ============================================================
-- 16. LOGIN_HISTORY TABLE
-- ============================================================
DROP TABLE IF EXISTS login_history CASCADE;
CREATE TABLE login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status login_status NOT NULL,
    ip_address VARCHAR(64),
    user_agent VARCHAR(300),
    device_name VARCHAR(200),
    location VARCHAR(200),
    failure_reason VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_status ON login_history(status);
CREATE INDEX idx_login_history_created_at ON login_history(created_at);

-- ============================================================
-- 17. AUDIT_LOGS TABLE
-- ============================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    description VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(64),
    user_agent VARCHAR(300),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- 18. SUPPORT_TICKETS TABLE
-- ============================================================
DROP TABLE IF EXISTS support_tickets CASCADE;
CREATE TABLE support_tickets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'open',
    assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);

-- ============================================================
-- 19. PASSWORD_RESETS TABLE
-- ============================================================
DROP TABLE IF EXISTS password_resets CASCADE;
CREATE TABLE password_resets (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_expires_at ON password_resets(expires_at);

-- ============================================================
-- 20. DOCUMENTS TABLE
-- ============================================================
DROP TABLE IF EXISTS documents CASCADE;
CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    doc_type doc_type NOT NULL,
    file_url VARCHAR(500),
    file_size_bytes BIGINT,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_doc_type ON documents(doc_type);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- ============================================================
-- 21. TRIGGERS FOR UPDATED_AT
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wire_transfers_updated_at
    BEFORE UPDATE ON wire_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deposited_cheques_updated_at
    BEFORE UPDATE ON deposited_cheques
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 22. SEED DATA - ADMIN USER
-- ============================================================
-- Admin credentials:
-- Email: admin@summitshares.com
-- Password: Admin@123456
INSERT INTO users (
    first_name, last_name, email, phone, password_hash, pin_hash,
    role, is_active, terms_accepted, email_verified,
    street, city, state, zip, country, occupation, doc_type,
    income_range, source_of_funds
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
    '100000+',
    'Salary'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 23. VERIFICATION QUERIES
-- ============================================================
-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check admin user
SELECT id, email, role, is_active 
FROM users 
WHERE email = 'admin@summitshares.com';

-- ============================================================
-- END OF SCHEMA
-- ============================================================
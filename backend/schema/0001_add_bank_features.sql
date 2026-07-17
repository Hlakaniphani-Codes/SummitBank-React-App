-- Additional schema for “normal bank” features beyond the minimal core.
-- Safe to run after the existing backend/schema/SummitDB.sql.
-- Adjust naming/columns if you want to integrate into the single master schema file.

-- Beneficiaries (for transfer to saved recipients)
CREATE TABLE IF NOT EXISTS beneficiaries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  bank_name VARCHAR(200) NOT NULL DEFAULT '',
  account_identifier VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_beneficiaries_user (user_id),
  CONSTRAINT fk_beneficiaries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bills & Invoices
CREATE TABLE IF NOT EXISTS payees (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  account_identifier VARCHAR(100) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payees_user (user_id),
  CONSTRAINT fk_payees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bills (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  payee_id BIGINT UNSIGNED NULL,
  name VARCHAR(200) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL,
  frequency ENUM('one-time','monthly','quarterly','yearly') NOT NULL DEFAULT 'one-time',
  status ENUM('upcoming','due','paid','cancelled') NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bills_user (user_id),
  KEY idx_bills_payee (payee_id),
  CONSTRAINT fk_bills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bills_payee FOREIGN KEY (payee_id) REFERENCES payees(id) ON DELETE SET NULL
);

-- Payments for bills (stored as transactions-like records)
CREATE TABLE IF NOT EXISTS invoice_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  bill_id BIGINT UNSIGNED NULL,
  payee_id BIGINT UNSIGNED NULL,
  transaction_id VARCHAR(64) NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  description VARCHAR(255) NOT NULL DEFAULT '',
  status ENUM('completed','pending','failed') NOT NULL DEFAULT 'completed',
  payment_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invoice_payments_user (user_id),
  CONSTRAINT fk_invoice_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_payments_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoice_payments_payee FOREIGN KEY (payee_id) REFERENCES payees(id) ON DELETE SET NULL
);

-- Statements & Tax documents
CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  doc_type ENUM('statement','tax') NOT NULL,
  title VARCHAR(200) NOT NULL,
  period_start DATE NULL,
  period_end DATE NULL,
  file_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  file_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_documents_user (user_id),
  CONSTRAINT fk_documents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Devices/Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  device_name VARCHAR(200) NOT NULL DEFAULT '',
  location VARCHAR(200) NOT NULL DEFAULT '',
  ip_address VARCHAR(64) NOT NULL DEFAULT '',
  user_agent VARCHAR(300) NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NULL,
  created_token VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_user_sessions_user (user_id),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


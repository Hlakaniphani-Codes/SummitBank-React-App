-- SummitDB schema (minimal but compatible with this backend)
-- Run in MySQL:
--   SOURCE backend/schema/SummitDB.sql;

DROP DATABASE IF EXISTS SummitDB;
CREATE DATABASE SummitDB;
USE SummitDB;

-- users
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  street VARCHAR(255) NOT NULL DEFAULT '',
  apartment VARCHAR(100) NULL,
  city VARCHAR(100) NOT NULL DEFAULT '',
  state VARCHAR(100) NOT NULL DEFAULT '',
  zip VARCHAR(30) NOT NULL DEFAULT '',
  country VARCHAR(2) NOT NULL DEFAULT 'US',
  occupation VARCHAR(100) NOT NULL DEFAULT '',
  employer VARCHAR(150) NULL,
  income_range VARCHAR(100) NOT NULL DEFAULT '',
  source_of_funds VARCHAR(100) NOT NULL DEFAULT '',
  ssn_encrypted VARBINARY(256) NULL,
  doc_type ENUM('passport','stateid','driverslicense') NOT NULL DEFAULT 'passport',
  pin_hash VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  terms_accepted TINYINT(1) NOT NULL DEFAULT 0,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  phone_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_users_email (email)
);

-- accounts
CREATE TABLE accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_type ENUM('checking','savings') NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  routing_number VARCHAR(50) NULL,
  apy DECIMAL(7,4) NULL,
  status ENUM('active','inactive','closed') NOT NULL DEFAULT 'active',
  opened_at DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_accounts_user (user_id),
  UNIQUE KEY uniq_account_number (account_number),
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- cards
CREATE TABLE cards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NULL,
  card_type ENUM('debit','credit') NOT NULL,
  card_network ENUM('visa','mastercard','amex','discover') NOT NULL DEFAULT 'visa',
  last4 VARCHAR(4) NOT NULL,
  expiry_month INT NOT NULL,
  expiry_year INT NOT NULL,
  cardholder_name VARCHAR(200) NOT NULL,
  status ENUM('active','blocked','pending','expired') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cards_user (user_id),
  CONSTRAINT fk_cards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cards_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- transactions
CREATE TABLE transactions (
  transaction_id VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NULL,
  amount DECIMAL(18,2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  type ENUM('transfer','credit','debit','payment') NOT NULL,
  balance_after DECIMAL(18,2) NULL,
  status ENUM('completed','pending','failed') NOT NULL DEFAULT 'completed',
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (transaction_id),
  KEY idx_tx_user (user_id),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- notifications
CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT '',
  description VARCHAR(255) NOT NULL DEFAULT '',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


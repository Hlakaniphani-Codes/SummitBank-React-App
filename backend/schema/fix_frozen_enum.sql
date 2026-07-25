-- ============================================================
-- Migration: Add 'frozen' to account_status enum
-- ============================================================
-- This fixes the error: invalid input value for enum account_status: "frozen"
-- Run this if you see: "column "frozen" does not exist" when freezing accounts

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'account_status'
  ) THEN
    -- Add 'frozen' to the account_status enum if it doesn't already include it
    ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'frozen';
    RAISE NOTICE 'Added ''frozen'' to account_status enum';
  ELSE
    RAISE NOTICE 'account_status enum does not exist, skipping';
  END IF;
END $$;

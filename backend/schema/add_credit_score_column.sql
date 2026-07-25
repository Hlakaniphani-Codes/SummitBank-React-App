-- ============================================================
-- Migration: Add credit_score column to users table
-- ============================================================

-- Add credit_score column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'credit_score'
  ) THEN
    ALTER TABLE users ADD COLUMN credit_score INTEGER DEFAULT NULL;
    RAISE NOTICE 'Added credit_score column to users table';
  ELSE
    RAISE NOTICE 'credit_score column already exists';
  END IF;
END $$;

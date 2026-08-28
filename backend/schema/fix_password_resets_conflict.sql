-- ============================================================
-- Migration: Ensure password_resets.user_id has a unique constraint
-- ============================================================
-- This fixes the error: "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification"
--
-- authController.js's forgotPassword does:
--   INSERT INTO password_resets (user_id, token, expires_at)
--   VALUES (...) ON CONFLICT (user_id) DO UPDATE SET ...
-- which requires a unique/exclusion constraint on user_id. On
-- databases created from an older version of this table (primary key
-- on token instead of user_id), that request always fails.
--
-- Adds a UNIQUE constraint on user_id without touching whatever
-- existing primary key the table already has - safe to run
-- regardless of the table's current state.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'password_resets'::regclass
      AND contype IN ('p', 'u')
      AND (
        SELECT array_agg(a.attname ORDER BY a.attname)
        FROM unnest(conkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = conrelid AND a.attnum = k.attnum
      ) = ARRAY['user_id']
  ) THEN
    ALTER TABLE password_resets ADD CONSTRAINT password_resets_user_id_unique UNIQUE (user_id);
    RAISE NOTICE 'Added unique constraint on password_resets.user_id';
  ELSE
    RAISE NOTICE 'password_resets.user_id already has a unique/primary key constraint, skipping';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

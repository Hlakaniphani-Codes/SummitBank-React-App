-- Adds OTP-specific values to the existing audit_action enum
-- Safe, additive migration - does not affect existing rows or values

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'otp_generated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'otp_verified';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'otp_failed';

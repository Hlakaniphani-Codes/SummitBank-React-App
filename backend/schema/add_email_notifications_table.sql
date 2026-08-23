-- Email delivery ledger for transactional notifications
-- Safe, additive migration for the existing Summit Shares schema

CREATE TABLE IF NOT EXISTS email_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    reference_id BIGINT NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_body TEXT,
    text_body TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_notifications_unique_event UNIQUE (user_id, event_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_event_type ON email_notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at);

CREATE OR REPLACE FUNCTION set_email_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_notifications_updated_at ON email_notifications;
CREATE TRIGGER trg_email_notifications_updated_at
BEFORE UPDATE ON email_notifications
FOR EACH ROW
EXECUTE FUNCTION set_email_notifications_updated_at();

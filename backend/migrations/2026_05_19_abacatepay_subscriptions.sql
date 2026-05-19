ALTER TABLE subscriptions ALTER COLUMN plan_id DROP NOT NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_code VARCHAR;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider VARCHAR NOT NULL DEFAULT 'manual';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_checkout_id VARCHAR;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'active';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS monthly_correction_limit INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS monthly_corrections_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS usage_month_start TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS daily_corrections_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS usage_day VARCHAR;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS raw_json TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_provider_subscription_id
    ON subscriptions (provider_subscription_id)
    WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions (current_period_end);

CREATE TABLE IF NOT EXISTS abacatepay_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR NOT NULL UNIQUE,
    event_type VARCHAR NOT NULL,
    user_id INTEGER REFERENCES users(id),
    plan_code VARCHAR,
    provider_checkout_id VARCHAR,
    provider_subscription_id VARCHAR,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    raw_json TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_abacatepay_events_event_type ON abacatepay_events (event_type);
CREATE INDEX IF NOT EXISTS idx_abacatepay_events_user_id ON abacatepay_events (user_id);
CREATE INDEX IF NOT EXISTS idx_abacatepay_events_checkout_id ON abacatepay_events (provider_checkout_id);
CREATE INDEX IF NOT EXISTS idx_abacatepay_events_subscription_id ON abacatepay_events (provider_subscription_id);

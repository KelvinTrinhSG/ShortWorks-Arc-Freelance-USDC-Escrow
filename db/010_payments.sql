-- PayPal payments for jobs (docs/payments.md). Safe to run more than once.

-- Freelancer's connected PayPal account (Multiparty seller onboarding).
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_tracking_id VARCHAR(64);  -- sent to PayPal when connecting
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_merchant_id VARCHAR(32);  -- set once connected
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_status      VARCHAR(20) NOT NULL DEFAULT 'not_connected';
                                                                            -- not_connected | pending | ready | blocked
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_checked_at  TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS users_paypal_tracking_idx ON users (paypal_tracking_id);

-- One payment per hired proposal (= job). Amount and platform fee are fixed when the order is created.
-- RESTRICT: a project or account with money on it can't be deleted (the API refuses first).
CREATE TABLE IF NOT EXISTS job_payments (
    id                 SERIAL PRIMARY KEY,
    proposal_id        INTEGER       NOT NULL UNIQUE REFERENCES proposals(id) ON DELETE RESTRICT,
    seller_merchant_id VARCHAR(32)   NOT NULL,
    order_id           VARCHAR(40)   NOT NULL UNIQUE,
    authorization_id   VARCHAR(40),
    capture_id         VARCHAR(40),
    currency           CHAR(3)       NOT NULL DEFAULT 'USD',
    amount             NUMERIC(10,2) NOT NULL,
    platform_fee       NUMERIC(10,2) NOT NULL,
    status             VARCHAR(20)   NOT NULL, -- created | authorized | capturing | captured | voided | expired | failed
    expires_at         TIMESTAMPTZ,            -- the authorization's expiration_time
    gross_amount       NUMERIC(10,2),          -- seller_receivable_breakdown after capture
    paypal_fee         NUMERIC(10,2),
    net_to_freelancer  NUMERIC(10,2),
    last_debug_id      VARCHAR(40),            -- PayPal debug_id of the last error, to ask PayPal about it
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_payments_status_idx ON job_payments (status, expires_at);

-- proposals.job_status gains 'cancelled' (an admin released the money to the client after a dispute).

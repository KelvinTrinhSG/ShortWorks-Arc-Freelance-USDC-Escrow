-- Paying for a job in USDC on Arc, through the ShortWorksEscrow contract (docs/arc-payments.md).
-- Alongside PayPal (010_payments.sql): a job is paid one way or the other. Safe to run more than once.

-- The freelancer's wallet for Arc payments, proven by a signed message (POST /api/arc/wallet).
ALTER TABLE users ADD COLUMN IF NOT EXISTS arc_wallet             VARCHAR(42);
ALTER TABLE users ADD COLUMN IF NOT EXISTS arc_wallet_verified_at TIMESTAMPTZ;

-- The job id used on the contract. Not proposals.id: after an undo (refunded on-chain) the same
-- proposal can be paid again, and the contract funds each job id only once.
CREATE SEQUENCE IF NOT EXISTS job_arc_escrow_job_id_seq;

-- One Arc payment per hired proposal (= job). The amounts, wallets and expiry are the signed terms.
-- RESTRICT: a project or account with money on it can't be deleted (the API refuses first).
CREATE TABLE IF NOT EXISTS job_arc_payments (
    id                 SERIAL PRIMARY KEY,
    proposal_id        INTEGER       NOT NULL UNIQUE REFERENCES proposals(id) ON DELETE RESTRICT,
    chain_id           INTEGER       NOT NULL,   -- 5042002 testnet | 5042 mainnet
    escrow_address     VARCHAR(42)   NOT NULL,   -- the contract that holds (or held) the money
    escrow_job_id      BIGINT        NOT NULL UNIQUE,
    client_wallet      VARCHAR(42)   NOT NULL,
    freelancer_wallet  VARCHAR(42)   NOT NULL,
    amount             NUMERIC(12,6) NOT NULL,   -- USDC, 6 decimals
    fee                NUMERIC(12,6) NOT NULL,   -- platform fee, part of amount
    expires_at         TIMESTAMPTZ   NOT NULL,   -- after this the client can reclaim on-chain (unless frozen)
    signature_deadline TIMESTAMPTZ   NOT NULL,   -- the signed terms can't be funded after this
    status             VARCHAR(20)   NOT NULL,   -- signed | funded | releasing | released | refunding | refunded
    fund_tx            VARCHAR(66),
    settle_tx          VARCHAR(66),              -- release / refund / reclaim transaction
    settled_by         VARCHAR(42),              -- who sent it (client, freelancer, ShortWorks' operator)
    last_error         TEXT,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_arc_payments_status_idx ON job_arc_payments (status, expires_at);

-- job_events / notifications gain 'payment_refunded': the USDC went back to the client outside
-- ShortWorks (reclaim after expiry, or the freelancer refunded), so the job is cancelled.

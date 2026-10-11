-- Job workflow after the client accepts a proposal (docs/jobs.md).
-- Safe to run more than once.

-- in_progress -> submitted -> completed, with disputed on the side.
-- Only meaningful while proposals.status = 'accepted'.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS job_status VARCHAR(20) NOT NULL DEFAULT 'in_progress';
-- Where the job was when a dispute was opened, so withdrawing it can go back there.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS status_before_dispute VARCHAR(20);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Everything that happens on a job, oldest first: the activity log on /job-single/{id}.
-- `links` holds the delivered videos on a 'submitted' event; `reason` the dispute reason.
CREATE TABLE IF NOT EXISTS job_events (
    id          SERIAL PRIMARY KEY,
    proposal_id INTEGER     NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    actor_id    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    type        VARCHAR(30) NOT NULL, -- submitted | revision_requested | approved | dispute_opened | dispute_withdrawn
    note        VARCHAR(1000),
    links       TEXT[],
    reason      VARCHAR(30),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_events_proposal_idx ON job_events (proposal_id, created_at);

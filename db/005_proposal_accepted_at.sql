-- When the client accepted the proposal (start of the job). NULL when not accepted.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Proposals accepted before this column existed: use the send date as a best guess.
UPDATE proposals SET accepted_at = created_at WHERE status = 'accepted' AND accepted_at IS NULL;

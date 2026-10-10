-- In-app notifications for the bell in the header (docs/notifications.md).
-- The text is built when reading, from `type` + the project and actor, so renames show up.
CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,     -- who receives it
    actor_id    INTEGER     REFERENCES users(id) ON DELETE CASCADE,              -- who caused it
    type        VARCHAR(30) NOT NULL, -- invited | invitation_declined | proposal_received | proposal_accepted | proposal_declined
    project_id  INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    proposal_id INTEGER     REFERENCES proposals(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

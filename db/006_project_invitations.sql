-- A client inviting a freelancer to send a proposal for a project (docs/invitations.md).
-- One invitation per freelancer per project. Whether they answered is read from `proposals`.
CREATE TABLE IF NOT EXISTS project_invitations (
    id            SERIAL PRIMARY KEY,
    project_id    INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    freelancer_id INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, freelancer_id)
);

CREATE INDEX IF NOT EXISTS project_invitations_freelancer_idx
    ON project_invitations (freelancer_id, created_at DESC);

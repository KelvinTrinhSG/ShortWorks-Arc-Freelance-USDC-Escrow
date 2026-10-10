-- Projects posted by clients and proposals sent by freelancers (docs/projects.md).
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS projects (
    id               SERIAL PRIMARY KEY,
    client_id        INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(70)   NOT NULL,
    platforms        TEXT[]        NOT NULL,
    work_type        VARCHAR(20)   NOT NULL,
    video_count      INTEGER       NOT NULL CHECK (video_count BETWEEN 1 AND 50),
    video_length     VARCHAR(10)   NOT NULL,
    brief            VARCHAR(1000) NOT NULL,
    deadline         DATE          NOT NULL,
    budget_per_video NUMERIC(10, 2) NOT NULL CHECK (budget_per_video > 0),
    status           VARCHAR(20)   NOT NULL DEFAULT 'open', -- open | closed
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_references (
    id         SERIAL PRIMARY KEY,
    project_id INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url        TEXT        NOT NULL,
    platform   VARCHAR(20) NOT NULL,
    sort_order INTEGER     NOT NULL DEFAULT 0
);

-- One proposal per freelancer per project.
CREATE TABLE IF NOT EXISTS proposals (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    freelancer_id   INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price_per_video NUMERIC(10, 2) NOT NULL CHECK (price_per_video > 0),
    delivery_date   DATE           NOT NULL,
    cover_letter    VARCHAR(1500)  NOT NULL,
    sample_url      TEXT,
    status          VARCHAR(20)    NOT NULL DEFAULT 'pending', -- pending | accepted | declined
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, freelancer_id)
);

CREATE INDEX IF NOT EXISTS projects_open_idx ON projects (status, created_at DESC);
CREATE INDEX IF NOT EXISTS projects_platforms_idx ON projects USING GIN (platforms);
CREATE INDEX IF NOT EXISTS project_references_project_idx ON project_references (project_id, sort_order);
CREATE INDEX IF NOT EXISTS proposals_project_idx ON proposals (project_id, created_at);

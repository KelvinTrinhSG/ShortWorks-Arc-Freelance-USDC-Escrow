-- Services freelancers offer, ordered and paid on the service page (docs/services.md).
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS services (
    id              SERIAL PRIMARY KEY,
    freelancer_id   INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(80)    NOT NULL,
    work_type       VARCHAR(20)    NOT NULL,
    platforms       TEXT[]         NOT NULL,
    video_length    VARCHAR(10)    NOT NULL,
    description     VARCHAR(1500)  NOT NULL,
    price_per_video NUMERIC(10, 2) NOT NULL CHECK (price_per_video > 0),
    delivery_days   INTEGER        NOT NULL CHECK (delivery_days BETWEEN 1 AND 25),
    revisions       INTEGER        NOT NULL DEFAULT 1,   -- -1 = unlimited
    max_videos      INTEGER        NOT NULL DEFAULT 10 CHECK (max_videos BETWEEN 1 AND 50),
    status          VARCHAR(20)    NOT NULL DEFAULT 'active', -- active | paused
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Up to 3 sample videos per service (TikTok / Reels / Shorts / Facebook links).
CREATE TABLE IF NOT EXISTS service_samples (
    id         SERIAL PRIMARY KEY,
    service_id INTEGER     NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    url        TEXT        NOT NULL,
    platform   VARCHAR(20) NOT NULL,
    sort_order INTEGER     NOT NULL DEFAULT 0
);

-- An order is a private project (closed to proposals) holding one proposal from the
-- service's freelancer, which the client then hires and pays like any other.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS services_active_idx ON services (status, created_at DESC);
CREATE INDEX IF NOT EXISTS services_freelancer_idx ON services (freelancer_id);
CREATE INDEX IF NOT EXISTS service_samples_service_idx ON service_samples (service_id, sort_order);

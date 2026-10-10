-- Talent profile for short-form video creators (docs/my-profile.md).
-- Safe to run more than once.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS headline         VARCHAR(70),
  ADD COLUMN IF NOT EXISTS bio              VARCHAR(300),
  ADD COLUMN IF NOT EXISTS roles            TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS country          VARCHAR(2),
  ADD COLUMN IF NOT EXISTS timezone         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS languages        TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability     VARCHAR(20) NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS platforms        TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS niches           TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tools            TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS starting_price   NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS turnaround_hours INTEGER,
  ADD COLUMN IF NOT EXISTS free_revisions   INTEGER,              -- -1 = unlimited, NULL = not answered
  ADD COLUMN IF NOT EXISTS phone            VARCHAR(30),
  ADD COLUMN IF NOT EXISTS paypal_email     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ,         -- NULL = no photo
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Profile photo, resized to 256x256 JPEG in the browser (~30KB).
CREATE TABLE IF NOT EXISTS user_avatars (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data       BYTEA       NOT NULL,
    mime_type  VARCHAR(20) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_videos (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url        TEXT        NOT NULL,
    platform   VARCHAR(20) NOT NULL,
    niche      VARCHAR(30) NOT NULL,
    role       VARCHAR(30),
    result     VARCHAR(60),
    sort_order INTEGER     NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolio_videos_user_idx ON portfolio_videos (user_id, sort_order);
CREATE INDEX IF NOT EXISTS users_niches_idx    ON users USING GIN (niches);
CREATE INDEX IF NOT EXISTS users_platforms_idx ON users USING GIN (platforms);

-- Replaced by free_revisions = -1 for "unlimited".
ALTER TABLE users DROP COLUMN IF EXISTS revisions_set;

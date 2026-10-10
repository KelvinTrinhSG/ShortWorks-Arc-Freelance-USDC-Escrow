-- Run once against the Render database (see docs/render-postgresql-setup.md, Step 3).
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    display_name  VARCHAR(100) NOT NULL,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- "KelvinCOD" and "kelvincod" count as the same username.
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key ON users (LOWER(username));

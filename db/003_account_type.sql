-- Who the account is for: hiring talent ('client') or offering work ('freelancer').
-- Existing accounts were all created as talent, so they default to 'freelancer'.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'freelancer';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_account_type_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_account_type_check CHECK (account_type IN ('client', 'freelancer'));
  END IF;
END $$;

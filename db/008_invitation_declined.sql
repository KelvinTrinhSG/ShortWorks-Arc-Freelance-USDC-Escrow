-- When the freelancer declined the invitation. NULL = not declined (docs/invitations.md).
ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

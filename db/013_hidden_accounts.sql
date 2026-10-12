-- Accounts kept out of every public list (freelancers, employers, services, projects, home page
-- sections): test accounts and the like. They can still log in and use their own jobs; nothing is
-- deleted, so their jobs and payments stay intact. Safe to run more than once.
ALTER TABLE users ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- Test accounts from building ShortWorks (2026-10-12): "Kelvin", "kelvinClient",
-- "kelvinFreelancer 1/2", "LangSky", with their "test" service and projects.
UPDATE users SET hidden = TRUE
WHERE username IN ('KelvinCOD', 'kelvinClient', 'kelvinFreelancer1', 'kelvinFreelancer2', 'LangSky');

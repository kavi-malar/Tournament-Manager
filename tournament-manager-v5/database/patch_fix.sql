-- ============================================================
-- PATCH: Bug Fixes
-- Run this in MySQL after your existing schema is set up
-- ============================================================

USE tournament_manager;

-- FIX 1: Reassign all sample tournaments to admin (id=1)
-- This lets the admin account delete them from the UI
UPDATE tournaments SET organizer_id = 1 WHERE organizer_id IS NOT NULL;

-- FIX 2: Make sure the admin user has the admin role
-- (password hash itself is set correctly in schema.sql as of this version)
UPDATE users SET role = 'admin' WHERE username = 'admin';

-- FIX 3: Verify all users have proper IDs for team member testing
-- Shows you which user IDs exist so you can add them as members
SELECT id, username, email, role FROM users ORDER BY id;

SELECT 'Patch applied! All tournaments now owned by admin.' AS status;

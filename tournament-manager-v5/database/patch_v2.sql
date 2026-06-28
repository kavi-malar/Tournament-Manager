-- ============================================================
-- PATCH v2 - Run this if you already have the database set up
-- This adds the audit_log table and triggers
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================

USE tournament_manager;

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    old_values JSON,
    new_values JSON,
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS after_match_result_insert;
DROP TRIGGER IF EXISTS after_match_result_update;

DELIMITER //

CREATE TRIGGER after_match_result_insert
AFTER INSERT ON matches
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' THEN
        IF NEW.winner_id IS NOT NULL THEN
            UPDATE teams SET wins = wins + 1, points = points + 3 WHERE id = NEW.winner_id;
            IF NEW.team1_id != NEW.winner_id THEN
                UPDATE teams SET losses = losses + 1 WHERE id = NEW.team1_id;
            ELSE
                UPDATE teams SET losses = losses + 1 WHERE id = NEW.team2_id;
            END IF;
        ELSE
            UPDATE teams SET draws = draws + 1, points = points + 1 WHERE id = NEW.team1_id;
            UPDATE teams SET draws = draws + 1, points = points + 1 WHERE id = NEW.team2_id;
        END IF;
    END IF;
END //

CREATE TRIGGER after_match_result_update
AFTER UPDATE ON matches
FOR EACH ROW
BEGIN
    IF OLD.status = 'completed' THEN
        IF OLD.winner_id IS NOT NULL THEN
            UPDATE teams SET wins = GREATEST(wins-1,0), points = GREATEST(points-3,0) WHERE id = OLD.winner_id;
            IF OLD.team1_id != OLD.winner_id THEN
                UPDATE teams SET losses = GREATEST(losses-1,0) WHERE id = OLD.team1_id;
            ELSE
                UPDATE teams SET losses = GREATEST(losses-1,0) WHERE id = OLD.team2_id;
            END IF;
        ELSE
            UPDATE teams SET draws = GREATEST(draws-1,0), points = GREATEST(points-1,0) WHERE id = OLD.team1_id;
            UPDATE teams SET draws = GREATEST(draws-1,0), points = GREATEST(points-1,0) WHERE id = OLD.team2_id;
        END IF;
    END IF;

    IF NEW.status = 'completed' THEN
        IF NEW.winner_id IS NOT NULL THEN
            UPDATE teams SET wins = wins + 1, points = points + 3 WHERE id = NEW.winner_id;
            IF NEW.team1_id != NEW.winner_id THEN
                UPDATE teams SET losses = losses + 1 WHERE id = NEW.team1_id;
            ELSE
                UPDATE teams SET losses = losses + 1 WHERE id = NEW.team2_id;
            END IF;
        ELSE
            UPDATE teams SET draws = draws + 1, points = points + 1 WHERE id = NEW.team1_id;
            UPDATE teams SET draws = draws + 1, points = points + 1 WHERE id = NEW.team2_id;
        END IF;
    END IF;
END //

DROP PROCEDURE IF EXISTS GetTeamMatchSuggestions //

CREATE PROCEDURE GetTeamMatchSuggestions(IN p_team_id INT)
BEGIN
    SELECT
        m.id, m.match_date, m.status, m.venue, m.round_number,
        m.team1_score, m.team2_score, m.winner_id,
        t1.name AS team1_name, t2.name AS team2_name,
        t.name AS tournament_name, t.sport,
        CASE
            WHEN m.status = 'scheduled' AND m.match_date > NOW() THEN
                CONCAT('Upcoming in ', DATEDIFF(m.match_date, NOW()), ' day(s)')
            WHEN m.status = 'ongoing' THEN 'Match is LIVE right now!'
            WHEN m.status = 'completed' AND m.winner_id = p_team_id THEN 'WIN - Great performance!'
            WHEN m.status = 'completed' AND m.winner_id IS NULL THEN 'DRAW - Good effort!'
            WHEN m.status = 'completed' AND m.winner_id != p_team_id THEN 'LOSS - Keep training!'
            WHEN m.status = 'cancelled' THEN 'Match was cancelled'
            ELSE 'Check schedule'
        END AS suggestion
    FROM matches m
    JOIN teams t1 ON m.team1_id = t1.id
    JOIN teams t2 ON m.team2_id = t2.id
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE m.team1_id = p_team_id OR m.team2_id = p_team_id
    ORDER BY m.match_date ASC;
END //

DELIMITER ;

SELECT 'Patch v2 applied successfully!' AS status;

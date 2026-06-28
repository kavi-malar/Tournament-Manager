-- ============================================================
-- Tournament Manager - Patch v3
-- New Features: Notifications, Achievements, Announcements,
--               H2H Stats, User Management, Leaderboard
-- Bug Fixes: Admin permissions on sample data
-- ============================================================

USE tournament_manager;

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('match_scheduled', 'match_result', 'tournament_start', 'announcement', 'achievement', 'registration') DEFAULT 'match_scheduled',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- ACHIEVEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    badge_type ENUM('first_win','five_wins','ten_wins','unbeaten_streak','tournament_champion','hat_trick','veteran') NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    badge_icon VARCHAR(20) NOT NULL,
    description VARCHAR(255),
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_badge (user_id, badge_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- TOURNAMENT ANNOUNCEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    author_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- ADD registration_deadline TO tournaments (if not present)
-- ============================================================
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_deadline DATE DEFAULT NULL;

-- ============================================================
-- ADD bio/avatar TO users (if not present)  
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;

-- ============================================================
-- FIX: Make deleteTournament available to both admin AND organizer
-- (already handled in backend, just documenting here)
-- The deleteTournament route was adminOnly — we update it to
-- allow organizer to delete their own tournaments.
-- ============================================================

-- ============================================================
-- TRIGGER: Auto-notify team members when a match is scheduled
-- ============================================================
DROP TRIGGER IF EXISTS notify_match_scheduled;
DELIMITER //
CREATE TRIGGER notify_match_scheduled
AFTER INSERT ON matches
FOR EACH ROW
BEGIN
    -- Notify team1 members
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
    SELECT tm.user_id,
        'match_scheduled',
        CONCAT('Match Scheduled'),
        CONCAT('Your team has a match scheduled on ', DATE_FORMAT(NEW.match_date, '%M %d, %Y'), IF(NEW.venue != '', CONCAT(' at ', NEW.venue), '')),
        'match',
        NEW.id
    FROM team_members tm WHERE tm.team_id = NEW.team1_id;

    -- Notify team2 members
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
    SELECT tm.user_id,
        'match_scheduled',
        CONCAT('Match Scheduled'),
        CONCAT('Your team has a match scheduled on ', DATE_FORMAT(NEW.match_date, '%M %d, %Y'), IF(NEW.venue != '', CONCAT(' at ', NEW.venue), '')),
        'match',
        NEW.id
    FROM team_members tm WHERE tm.team_id = NEW.team2_id;
END //
DELIMITER ;

-- ============================================================
-- TRIGGER: Auto-notify on match result update
-- ============================================================
DROP TRIGGER IF EXISTS notify_match_result;
DELIMITER //
CREATE TRIGGER notify_match_result
AFTER UPDATE ON matches
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Notify team1
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
        SELECT tm.user_id,
            'match_result',
            'Match Result Updated',
            CONCAT('Match result: ', NEW.team1_score, ' - ', NEW.team2_score,
                CASE
                    WHEN NEW.winner_id = NEW.team1_id THEN ' — Your team WON! 🏆'
                    WHEN NEW.winner_id = NEW.team2_id THEN ' — Your team lost.'
                    ELSE ' — It''s a DRAW!'
                END),
            'match',
            NEW.id
        FROM team_members tm WHERE tm.team_id = NEW.team1_id;

        -- Notify team2
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
        SELECT tm.user_id,
            'match_result',
            'Match Result Updated',
            CONCAT('Match result: ', NEW.team1_score, ' - ', NEW.team2_score,
                CASE
                    WHEN NEW.winner_id = NEW.team2_id THEN ' — Your team WON! 🏆'
                    WHEN NEW.winner_id = NEW.team1_id THEN ' — Your team lost.'
                    ELSE ' — It''s a DRAW!'
                END),
            'match',
            NEW.id
        FROM team_members tm WHERE tm.team_id = NEW.team2_id;
    END IF;
END //
DELIMITER ;

-- ============================================================
-- TRIGGER: Auto-award achievements
-- ============================================================
DROP TRIGGER IF EXISTS award_achievements;
DELIMITER //
CREATE TRIGGER award_achievements
AFTER UPDATE ON matches
FOR EACH ROW
BEGIN
    DECLARE winner_wins INT DEFAULT 0;

    IF NEW.status = 'completed' AND NEW.winner_id IS NOT NULL THEN
        SELECT wins INTO winner_wins FROM teams WHERE id = NEW.winner_id;

        -- First Win badge — award to captain of winning team
        IF winner_wins = 1 THEN
            INSERT IGNORE INTO achievements (user_id, badge_type, badge_name, badge_icon, description)
            SELECT captain_id, 'first_win', 'First Victory', '🥇', 'Won your very first match!'
            FROM teams WHERE id = NEW.winner_id;
        END IF;

        -- Five Wins badge
        IF winner_wins = 5 THEN
            INSERT IGNORE INTO achievements (user_id, badge_type, badge_name, badge_icon, description)
            SELECT captain_id, 'five_wins', 'High Fiver', '🖐️', 'Won 5 matches!'
            FROM teams WHERE id = NEW.winner_id;
        END IF;

        -- Ten Wins badge
        IF winner_wins = 10 THEN
            INSERT IGNORE INTO achievements (user_id, badge_type, badge_name, badge_icon, description)
            SELECT captain_id, 'ten_wins', 'Decade Dominator', '🔟', 'Won 10 matches!'
            FROM teams WHERE id = NEW.winner_id;
        END IF;
    END IF;
END //
DELIMITER ;

-- ============================================================
-- PROCEDURE: Get Head-to-Head stats between two teams
-- ============================================================
DROP PROCEDURE IF EXISTS GetHeadToHead;
DELIMITER //
CREATE PROCEDURE GetHeadToHead(IN p_team1_id INT, IN p_team2_id INT)
BEGIN
    SELECT
        COUNT(*) as total_matches,
        SUM(CASE WHEN winner_id = p_team1_id THEN 1 ELSE 0 END) as team1_wins,
        SUM(CASE WHEN winner_id = p_team2_id THEN 1 ELSE 0 END) as team2_wins,
        SUM(CASE WHEN winner_id IS NULL AND status = 'completed' THEN 1 ELSE 0 END) as draws
    FROM matches
    WHERE status = 'completed'
      AND ((team1_id = p_team1_id AND team2_id = p_team2_id)
        OR (team1_id = p_team2_id AND team2_id = p_team1_id));
END //
DELIMITER ;


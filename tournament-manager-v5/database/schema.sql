-- ============================================================
-- Tournament Manager Database Schema - Enhanced v2.0
-- DBMS Project | MySQL
-- Features: Triggers, Stored Procedures, Transactions, Audit Log
-- ============================================================

CREATE DATABASE IF NOT EXISTS tournament_manager;
USE tournament_manager;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'organizer', 'player') DEFAULT 'player',
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    logo VARCHAR(255),
    captain_id INT,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    draws INT DEFAULT 0,
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (captain_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_team_user (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tournaments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    sport VARCHAR(50) NOT NULL,
    format ENUM('single_elimination', 'double_elimination', 'round_robin', 'league') NOT NULL,
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    max_teams INT NOT NULL,
    prize_pool VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    organizer_id INT,
    banner VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tournament_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    team_id INT NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    UNIQUE KEY unique_registration (tournament_id, team_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    team1_id INT NOT NULL,
    team2_id INT NOT NULL,
    team1_score INT DEFAULT 0,
    team2_score INT DEFAULT 0,
    winner_id INT,
    status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
    match_date DATETIME NOT NULL,
    venue VARCHAR(150),
    round_number INT DEFAULT 1,
    match_number INT DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- ============================================================
-- AUDIT LOG TABLE
-- ============================================================
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

-- ============================================================
-- STANDINGS VIEW
-- ============================================================
CREATE OR REPLACE VIEW tournament_standings AS
SELECT
    tr.tournament_id,
    t.id AS team_id,
    t.name AS team_name,
    t.logo,
    COUNT(CASE WHEN m.status = 'completed' THEN 1 END) AS played,
    COUNT(CASE WHEN m.winner_id = t.id THEN 1 END) AS wins,
    COUNT(CASE WHEN m.status = 'completed' AND m.winner_id IS NULL THEN 1 END) AS draws,
    COUNT(CASE WHEN m.status = 'completed' AND m.winner_id IS NOT NULL AND m.winner_id != t.id THEN 1 END) AS losses,
    (COUNT(CASE WHEN m.winner_id = t.id THEN 1 END) * 3 +
     COUNT(CASE WHEN m.status = 'completed' AND m.winner_id IS NULL THEN 1 END)) AS points
FROM tournament_registrations tr
JOIN teams t ON tr.team_id = t.id
LEFT JOIN matches m ON tr.tournament_id = m.tournament_id
    AND (m.team1_id = t.id OR m.team2_id = t.id)
GROUP BY tr.tournament_id, t.id, t.name, t.logo
ORDER BY points DESC;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS after_match_result_insert;
DROP TRIGGER IF EXISTS after_match_result_update;

DELIMITER //

-- Trigger: Auto update team stats when match is completed (INSERT)
CREATE TRIGGER after_match_result_insert
AFTER INSERT ON matches
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' THEN
        IF NEW.winner_id IS NOT NULL THEN
            -- Winner gets 3 points
            UPDATE teams SET wins = wins + 1, points = points + 3 WHERE id = NEW.winner_id;
            -- Loser gets nothing
            IF NEW.team1_id != NEW.winner_id THEN
                UPDATE teams SET losses = losses + 1 WHERE id = NEW.team1_id;
            ELSE
                UPDATE teams SET losses = losses + 1 WHERE id = NEW.team2_id;
            END IF;
        ELSE
            -- Draw: both teams get 1 point
            UPDATE teams SET draws = draws + 1, points = points + 1 WHERE id = NEW.team1_id;
            UPDATE teams SET draws = draws + 1, points = points + 1 WHERE id = NEW.team2_id;
        END IF;
    END IF;
END //

-- Trigger: Auto update team stats when match result is UPDATED
CREATE TRIGGER after_match_result_update
AFTER UPDATE ON matches
FOR EACH ROW
BEGIN
    -- Reverse OLD stats if the match was previously completed
    IF OLD.status = 'completed' THEN
        IF OLD.winner_id IS NOT NULL THEN
            UPDATE teams SET wins = GREATEST(wins - 1, 0), points = GREATEST(points - 3, 0) WHERE id = OLD.winner_id;
            IF OLD.team1_id != OLD.winner_id THEN
                UPDATE teams SET losses = GREATEST(losses - 1, 0) WHERE id = OLD.team1_id;
            ELSE
                UPDATE teams SET losses = GREATEST(losses - 1, 0) WHERE id = OLD.team2_id;
            END IF;
        ELSE
            UPDATE teams SET draws = GREATEST(draws - 1, 0), points = GREATEST(points - 1, 0) WHERE id = OLD.team1_id;
            UPDATE teams SET draws = GREATEST(draws - 1, 0), points = GREATEST(points - 1, 0) WHERE id = OLD.team2_id;
        END IF;
    END IF;

    -- Apply NEW stats if match is now completed
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

DELIMITER ;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

DROP PROCEDURE IF EXISTS GenerateRoundRobinFixtures;
DROP PROCEDURE IF EXISTS GenerateKnockoutFixtures;
DROP PROCEDURE IF EXISTS GetTeamMatchSuggestions;

DELIMITER //

-- Procedure: Generate Round Robin fixtures for a tournament
CREATE PROCEDURE GenerateRoundRobinFixtures(IN p_tournament_id INT, IN p_start_date DATETIME, IN p_venue VARCHAR(150))
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE team1 INT;
    DECLARE team2 INT;
    DECLARE round_num INT DEFAULT 1;
    DECLARE match_num INT DEFAULT 1;
    DECLARE match_date DATETIME;
    DECLARE days_offset INT DEFAULT 0;

    -- Get all registered teams into a temp table
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_teams AS
        SELECT team_id, ROW_NUMBER() OVER (ORDER BY registered_at) as rn
        FROM tournament_registrations
        WHERE tournament_id = p_tournament_id AND status = 'approved';

    DECLARE total_teams INT;
    SELECT COUNT(*) INTO total_teams FROM temp_teams;

    -- Generate all pairs
    BEGIN
        DECLARE cur1 CURSOR FOR SELECT team_id FROM temp_teams ORDER BY rn;
        DECLARE cur2 CURSOR FOR SELECT team_id FROM temp_teams ORDER BY rn;
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

        -- Simple pairwise approach using cross join
        INSERT INTO matches (tournament_id, team1_id, team2_id, match_date, venue, round_number, match_number, status)
        SELECT
            p_tournament_id,
            t1.team_id,
            t2.team_id,
            DATE_ADD(p_start_date, INTERVAL (ROW_NUMBER() OVER (ORDER BY t1.rn, t2.rn) - 1) DAY),
            p_venue,
            CEIL((ROW_NUMBER() OVER (ORDER BY t1.rn, t2.rn)) / FLOOR(total_teams / 2)),
            ROW_NUMBER() OVER (ORDER BY t1.rn, t2.rn),
            'scheduled'
        FROM temp_teams t1
        JOIN temp_teams t2 ON t1.rn < t2.rn;
    END;

    DROP TEMPORARY TABLE IF EXISTS temp_teams;
END //

-- Procedure: Generate Knockout fixtures for a tournament
CREATE PROCEDURE GenerateKnockoutFixtures(IN p_tournament_id INT, IN p_start_date DATETIME, IN p_venue VARCHAR(150))
BEGIN
    DECLARE match_num INT DEFAULT 1;

    -- Get registered teams into temp table
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_ko_teams AS
        SELECT team_id, ROW_NUMBER() OVER (ORDER BY RAND()) as rn
        FROM tournament_registrations
        WHERE tournament_id = p_tournament_id AND status = 'approved';

    -- Pair teams: 1 vs 2, 3 vs 4, etc.
    INSERT INTO matches (tournament_id, team1_id, team2_id, match_date, venue, round_number, match_number, status)
    SELECT
        p_tournament_id,
        t1.team_id,
        t2.team_id,
        DATE_ADD(p_start_date, INTERVAL (t1.rn - 1) DAY),
        p_venue,
        1,
        t1.rn,
        'scheduled'
    FROM temp_ko_teams t1
    JOIN temp_ko_teams t2 ON t2.rn = t1.rn + 1
    WHERE t1.rn % 2 = 1;

    DROP TEMPORARY TABLE IF EXISTS temp_ko_teams;
END //

-- Procedure: Get match suggestions for a team
CREATE PROCEDURE GetTeamMatchSuggestions(IN p_team_id INT)
BEGIN
    SELECT
        m.id,
        m.match_date,
        m.status,
        m.venue,
        m.round_number,
        m.team1_score,
        m.team2_score,
        m.winner_id,
        t1.name AS team1_name,
        t2.name AS team2_name,
        t.name AS tournament_name,
        t.sport,
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

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT IGNORE INTO users (username, email, password, role) VALUES
('admin', 'admin@tournament.com','$2b$10$7QJ8H5Gz7rWkG7qR8z7Q8uK1zZlFzYxjvG0gZz9y1xYw8vH9p7Q2G','admin'),
('john_doe', 'john@example.com','$2b$10$7QJ8H5Gz7rWkG7qR8z7Q8uK1zZlFzYxjvG0gZz9y1xYw8vH9p7Q2G' ,'organizer'),
('jane_smith', 'jane@example.com','$2b$10$7QJ8H5Gz7rWkG7qR8z7Q8uK1zZlFzYxjvG0gZz9y1xYw8vH9p7Q2G', 'player');

INSERT IGNORE INTO teams (name, captain_id, wins, losses, draws, points) VALUES
('Thunder Wolves', 2, 5, 2, 1, 16),
('Fire Eagles', 3, 4, 3, 0, 12),
('Ice Dragons', 2, 3, 3, 2, 11),
('Storm Riders', 3, 6, 1, 0, 18);

INSERT IGNORE INTO tournaments (name, description, sport, format, status, max_teams, prize_pool, start_date, end_date, organizer_id) VALUES
('Spring Championship 2025', 'Annual spring football championship', 'Football', 'single_elimination', 'ongoing', 16, '$5000', '2026-03-01', '2026-04-30', 2),
('Summer Smash Basketball', 'Fast-paced summer basketball tournament', 'Basketball', 'round_robin', 'upcoming', 8, '$2000', '2026-06-01', '2026-07-15', 2),
('City Cricket Cup', 'Inter-college cricket competition', 'Cricket', 'league', 'completed', 10, '$3000', '2025-01-10', '2025-02-28', 3);

INSERT IGNORE INTO tournament_registrations (tournament_id, team_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4),
(2, 1), (2, 3),
(3, 2), (3, 4);

INSERT IGNORE INTO matches (tournament_id, team1_id, team2_id, team1_score, team2_score, winner_id, status, match_date, venue, round_number) VALUES
(1, 1, 2, 3, 1, 1, 'completed', '2025-03-05 15:00:00', 'City Stadium', 1),
(1, 3, 4, 2, 2, NULL, 'completed', '2025-03-06 15:00:00', 'City Stadium', 1),
(1, 1, 3, 0, 0, NULL, 'scheduled', '2025-04-10 15:00:00', 'City Stadium', 2),
(3, 2, 4, 5, 3, 2, 'completed', '2025-01-15 10:00:00', 'Cricket Ground A', 1);

-- Audit log sample
INSERT IGNORE INTO audit_log (user_id, action, entity_type, entity_id, description) VALUES
(1, 'CREATE', 'tournament', 1, 'Created Spring Championship 2025'),
(1, 'UPDATE', 'match', 1, 'Updated match result: Thunder Wolves 3 - 1 Fire Eagles');

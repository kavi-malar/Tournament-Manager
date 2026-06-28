-- Run this in MySQL if tournament_announcements table is missing
-- mysql -u root -p tournament_manager < create_missing_tables.sql

USE tournament_manager;

-- Announcements table
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

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('match_scheduled','match_result','tournament_start','announcement','achievement','registration') DEFAULT 'match_scheduled',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Achievements table
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

-- Registration deadline column
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_deadline DATE DEFAULT NULL;

-- Bio column on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;

SELECT 'All missing tables and columns created successfully!' AS status;
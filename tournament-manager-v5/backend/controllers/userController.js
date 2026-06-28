const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.role, u.created_at,
         COUNT(DISTINCT tm.team_id) as team_count
       FROM users u
       LEFT JOIN team_members tm ON u.id = tm.user_id
       GROUP BY u.id ORDER BY u.created_at DESC`
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE user role (admin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'organizer', 'player'].includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role' });
    if (parseInt(req.params.id) === parseInt(req.user.id))
      return res.status(400).json({ success: false, message: 'Cannot change your own role' });

    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

    try {
      await db.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, description) VALUES (?, 'UPDATE_ROLE', 'user', ?, ?)`,
        [req.user.id, req.params.id, `Changed role to: ${role}`]
      );
    } catch (_) {}

    res.json({ success: true, message: 'User role updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    if (parseInt(req.params.id) === parseInt(req.user.id))
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });

    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET player profile with stats
exports.getPlayerProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    // Safely fetch user - handle missing bio/avatar columns gracefully
    const [userRows] = await db.query(
      `SELECT id, username, email, role, created_at,
        IFNULL(bio, '') as bio,
        IFNULL(avatar, '') as avatar
       FROM users WHERE id = ?`,
      [userId]
    );
    if (!userRows.length) return res.status(404).json({ success: false, message: 'User not found' });

    const [teams] = await db.query(
      `SELECT t.id, t.name, t.wins, t.losses, t.draws, t.points,
         CASE WHEN t.captain_id = ? THEN 1 ELSE 0 END as is_captain
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = ?`, [userId, userId]
    ).catch(() => [[]]);

    // Achievements - return empty if table doesn't exist yet
    const [achievements] = await db.query(
      `SELECT * FROM achievements WHERE user_id = ? ORDER BY awarded_at DESC`, [userId]
    ).catch(() => [[]]);

    const [matchHistory] = await db.query(
      `SELECT m.*, t1.name as team1_name, t2.name as team2_name, w.name as winner_name,
         t.name as tournament_name, t.sport
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.id
       JOIN teams t2 ON m.team2_id = t2.id
       LEFT JOIN teams w ON m.winner_id = w.id
       JOIN tournaments t ON m.tournament_id = t.id
       JOIN team_members tm ON (tm.team_id = m.team1_id OR tm.team_id = m.team2_id)
       WHERE tm.user_id = ? AND m.status = 'completed'
       GROUP BY m.id ORDER BY m.match_date DESC LIMIT 10`, [userId]
    ).catch(() => [[]]);

    const [tournaments] = await db.query(
      `SELECT DISTINCT t.id, t.name, t.sport, t.status, t.start_date
       FROM tournaments t
       JOIN tournament_registrations tr ON t.id = tr.tournament_id
       JOIN team_members tm ON tr.team_id = tm.team_id
       WHERE tm.user_id = ?
       ORDER BY t.start_date DESC LIMIT 10`, [userId]
    ).catch(() => [[]]);

    res.json({
      success: true,
      user: userRows[0],
      teams: teams || [],
      achievements: achievements || [],
      match_history: matchHistory || [],
      tournaments: tournaments || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE own profile (bio)
exports.updateProfile = async (req, res) => {
  try {
    const { bio } = req.body;
    await db.query('UPDATE users SET bio = ? WHERE id = ?', [bio || null, req.user.id]);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET achievements for user
exports.getAchievements = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM achievements WHERE user_id = ? ORDER BY awarded_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, achievements: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.name, t.wins, t.losses, t.draws, t.points,
         u.username as captain_name,
         COUNT(DISTINCT tm_count.user_id) as member_count,
         COUNT(DISTINCT tr.tournament_id) as tournament_count,
         ROUND(
           CASE WHEN (t.wins + t.losses + t.draws) > 0
             THEN (t.wins / (t.wins + t.losses + t.draws)) * 100
             ELSE 0 END, 1
         ) as win_rate
       FROM teams t
       LEFT JOIN users u ON t.captain_id = u.id
       LEFT JOIN team_members tm_count ON t.id = tm_count.team_id
       LEFT JOIN tournament_registrations tr ON t.id = tr.team_id
       GROUP BY t.id
       ORDER BY t.points DESC, t.wins DESC, t.draws DESC
       LIMIT 50`
    );

    // Add rank
    const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));
    res.json({ success: true, leaderboard: ranked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET head-to-head stats
exports.getHeadToHead = async (req, res) => {
  try {
    const { team1_id, team2_id } = req.query;
    if (!team1_id || !team2_id)
      return res.status(400).json({ success: false, message: 'team1_id and team2_id required' });

    const [rows] = await db.query(
      `SELECT
         COUNT(*) as total_matches,
         SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as team1_wins,
         SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as team2_wins,
         SUM(CASE WHEN winner_id IS NULL AND status = 'completed' THEN 1 ELSE 0 END) as draws
       FROM matches
       WHERE status = 'completed'
         AND ((team1_id = ? AND team2_id = ?) OR (team1_id = ? AND team2_id = ?))`,
      [team1_id, team2_id, team1_id, team2_id, team2_id, team1_id]
    );

    const [history] = await db.query(
      `SELECT m.id, m.match_date, m.team1_score, m.team2_score, m.winner_id,
         t1.name as team1_name, t2.name as team2_name, t.name as tournament_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.id
       JOIN teams t2 ON m.team2_id = t2.id
       JOIN tournaments t ON m.tournament_id = t.id
       WHERE m.status = 'completed'
         AND ((m.team1_id = ? AND m.team2_id = ?) OR (m.team1_id = ? AND m.team2_id = ?))
       ORDER BY m.match_date DESC LIMIT 10`,
      [team1_id, team2_id, team2_id, team1_id]
    );

    res.json({ success: true, stats: rows[0], history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET audit log (admin only) 
exports.getAuditLog = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const [rows] = await db.query(
      `SELECT a.*, u.username FROM audit_log a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [countRow] = await db.query('SELECT COUNT(*) as total FROM audit_log');
    res.json({ success: true, logs: rows, total: countRow[0].total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
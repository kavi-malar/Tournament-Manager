const db = require('../config/db');

const auditLog = async (userId, action, entityId, description) => {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, description) VALUES (?, ?, 'team', ?, ?)`,
      [userId, action, entityId, description]
    );
  } catch (_) {}
};

// ── GET ALL TEAMS ────────────────────────────────────────────
exports.getAllTeams = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, u.username as captain_name,
       COUNT(tm.user_id) as member_count
       FROM teams t
       LEFT JOIN users u ON t.captain_id = u.id
       LEFT JOIN team_members tm ON t.id = tm.team_id
       GROUP BY t.id ORDER BY t.points DESC`
    );
    res.json({ success: true, teams: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET ONE TEAM ─────────────────────────────────────────────
exports.getTeam = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, u.username as captain_name FROM teams t
       LEFT JOIN users u ON t.captain_id = u.id WHERE t.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Team not found' });
    const [members] = await db.query(
      `SELECT u.id, u.username, u.email, tm.joined_at FROM users u
       JOIN team_members tm ON u.id = tm.user_id WHERE tm.team_id = ?`, [req.params.id]
    );
    res.json({ success: true, team: rows[0], members });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE TEAM ──────────────────────────────────────────────
exports.createTeam = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Team name required' });
    const [result] = await db.query(
      'INSERT INTO teams (name, captain_id) VALUES (?, ?)', [name, req.user.id]
    );
    await db.query('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)', [result.insertId, req.user.id]);
    await auditLog(req.user.id, 'CREATE', result.insertId, 'Created team: ' + name);
    res.status(201).json({ success: true, message: 'Team created', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Team name already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE TEAM ──────────────────────────────────────────────
exports.updateTeam = async (req, res) => {
  try {
    const { name } = req.body;
    const [check] = await db.query('SELECT captain_id FROM teams WHERE id = ?', [req.params.id]);
    if (!check.length) return res.status(404).json({ success: false, message: 'Team not found' });
    if (parseInt(check[0].captain_id) !== parseInt(req.user.id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Only the captain or admin can edit this team' });
    await db.query('UPDATE teams SET name = ? WHERE id = ?', [name, req.params.id]);
    await auditLog(req.user.id, 'UPDATE', req.params.id, 'Updated team name to: ' + name);
    res.json({ success: true, message: 'Team updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Team name already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE TEAM ──────────────────────────────────────────────
exports.deleteTeam = async (req, res) => {
  try {
    const [check] = await db.query('SELECT captain_id FROM teams WHERE id = ?', [req.params.id]);
    if (!check.length) return res.status(404).json({ success: false, message: 'Team not found' });
    if (parseInt(check[0].captain_id) !== parseInt(req.user.id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Only the captain or admin can delete this team' });
    await db.query('DELETE FROM teams WHERE id = ?', [req.params.id]);
    await auditLog(req.user.id, 'DELETE', req.params.id, 'Deleted team');
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADD MEMBER ───────────────────────────────────────────────
// FIX: accept username OR numeric user_id, show all available users via GET /users endpoint
exports.addMember = async (req, res) => {
  try {
    const { user_id, username } = req.body;

    let resolvedUserId = null;

    if (username && username.trim()) {
      // Look up by username
      const [byName] = await db.query('SELECT id FROM users WHERE username = ?', [username.trim()]);
      if (!byName.length)
        return res.status(404).json({ success: false, message: `No user found with username "${username.trim()}"` });
      resolvedUserId = byName[0].id;
    } else if (user_id) {
      // Look up by numeric ID
      const parsed = parseInt(user_id);
      if (isNaN(parsed))
        return res.status(400).json({ success: false, message: 'user_id must be a number' });
      const [byId] = await db.query('SELECT id, username FROM users WHERE id = ?', [parsed]);
      if (!byId.length)
        return res.status(404).json({ success: false, message: `No user found with ID ${parsed}. Check the Users list for valid IDs.` });
      resolvedUserId = byId[0].id;
    } else {
      return res.status(400).json({ success: false, message: 'Provide user_id or username' });
    }

    await db.query('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)', [req.params.id, resolvedUserId]);
    res.json({ success: true, message: 'Member added successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'User is already a member of this team' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── REMOVE MEMBER ────────────────────────────────────────────
exports.removeMember = async (req, res) => {
  try {
    await db.query('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── MY TEAMS ─────────────────────────────────────────────────
exports.getMyTeams = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, u.username as captain_name
       FROM teams t
       LEFT JOIN users u ON t.captain_id = u.id
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = ?`, [req.user.id]
    );
    res.json({ success: true, teams: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── LIST ALL USERS (for Add Member dropdown) ─────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.role
       FROM users u
       WHERE u.id NOT IN (
         SELECT user_id FROM team_members WHERE team_id = ?
       )
       ORDER BY u.username ASC`,
      [req.params.id]
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

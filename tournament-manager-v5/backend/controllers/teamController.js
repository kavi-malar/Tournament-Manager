const db = require('../config/db');

const auditLog = async (userId, action, entityId, description) => {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, description) VALUES (?, ?, 'team', ?, ?)`,
      [userId, action, entityId, description]
    );
  } catch (_) { /* non-fatal */ }
};

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

exports.deleteTeam = async (req, res) => {
  try {
    const [check] = await db.query('SELECT captain_id FROM teams WHERE id = ?', [req.params.id]);
    if (!check.length) return res.status(404).json({ success: false, message: 'Team not found' });
    // Allow captain OR admin to delete
    if (parseInt(check[0].captain_id) !== parseInt(req.user.id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Only the captain or admin can delete this team' });

    await db.query('DELETE FROM teams WHERE id = ?', [req.params.id]);
    await auditLog(req.user.id, 'DELETE', req.params.id, 'Deleted team');
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required' });
    // Verify user exists
    const [userCheck] = await db.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (!userCheck.length) return res.status(404).json({ success: false, message: 'User not found' });

    await db.query('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)', [req.params.id, user_id]);
    res.json({ success: true, message: 'Member added' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'User already in team' });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    await db.query('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get teams that a user belongs to (as member or captain)
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

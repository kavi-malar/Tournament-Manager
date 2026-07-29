const db = require('../config/db');

const auditLog = async (userId, action, entityId, description) => {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, description) VALUES (?, ?, 'tournament', ?, ?)`,
      [userId, action, entityId, description]
    );
  } catch (_) {}
};

// ── GET ALL ──────────────────────────────────────────────────
exports.getAllTournaments = async (req, res) => {
  try {
    const { status, sport } = req.query;
    let query = `SELECT t.*, u.username as organizer_name,
      COUNT(DISTINCT tr.team_id) as registered_teams
      FROM tournaments t
      LEFT JOIN users u ON t.organizer_id = u.id
      LEFT JOIN tournament_registrations tr ON t.id = tr.tournament_id
      WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (sport)  { query += ' AND t.sport = ?';  params.push(sport); }
    query += ' GROUP BY t.id ORDER BY t.created_at DESC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, tournaments: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET ONE ──────────────────────────────────────────────────
exports.getTournament = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, u.username as organizer_name,
       COUNT(DISTINCT tr.team_id) as registered_teams
       FROM tournaments t
       LEFT JOIN users u ON t.organizer_id = u.id
       LEFT JOIN tournament_registrations tr ON t.id = tr.tournament_id
       WHERE t.id = ? GROUP BY t.id`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Tournament not found' });
    const [teams] = await db.query(
      `SELECT t.id, t.name, t.logo, t.wins, t.losses, t.draws, t.points, tr.status, tr.registered_at
       FROM teams t JOIN tournament_registrations tr ON t.id = tr.team_id
       WHERE tr.tournament_id = ?`, [req.params.id]
    );
    res.json({ success: true, tournament: rows[0], teams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE ───────────────────────────────────────────────────
// FIX: only pull the exact columns that exist in the DB schema — no deadline field
exports.createTournament = async (req, res) => {
  try {
    const { name, description, sport, format, status, max_teams, prize_pool, start_date, end_date } = req.body;
    if (!name || !sport || !format || !max_teams || !start_date || !end_date)
      return res.status(400).json({ success: false, message: 'Required fields missing' });

    const [result] = await db.query(
      `INSERT INTO tournaments (name, description, sport, format, status, max_teams, prize_pool, start_date, end_date, organizer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description || '', sport, format, status || 'upcoming', parseInt(max_teams), prize_pool || '', start_date, end_date, req.user.id]
    );
    await auditLog(req.user.id, 'CREATE', result.insertId, 'Created tournament: ' + name);
    res.status(201).json({ success: true, message: 'Tournament created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE ───────────────────────────────────────────────────
// FIX: admin bypasses organizer ownership check entirely
exports.updateTournament = async (req, res) => {
  try {
    const { name, description, sport, format, status, max_teams, prize_pool, start_date, end_date } = req.body;
    const [rows] = await db.query('SELECT * FROM tournaments WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Tournament not found' });

    const t = rows[0];
    const isAdmin = req.user.role === 'admin';
    const isOwner = parseInt(t.organizer_id) === parseInt(req.user.id);
    if (!isAdmin && !isOwner)
      return res.status(403).json({ success: false, message: 'Not authorized to edit this tournament' });

    await db.query(
      `UPDATE tournaments SET name=?, description=?, sport=?, format=?, status=?, max_teams=?, prize_pool=?, start_date=?, end_date=? WHERE id=?`,
      [
        name || t.name,
        description !== undefined ? description : t.description,
        sport || t.sport,
        format || t.format,
        status || t.status,
        parseInt(max_teams) || t.max_teams,
        prize_pool !== undefined ? prize_pool : t.prize_pool,
        start_date || t.start_date,
        end_date || t.end_date,
        req.params.id
      ]
    );
    await auditLog(req.user.id, 'UPDATE', req.params.id, 'Updated tournament: ' + (name || t.name));
    res.json({ success: true, message: 'Tournament updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE ───────────────────────────────────────────────────
// FIX: admin can delete ANY tournament — no ownership check needed (route is already adminOnly)
exports.deleteTournament = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name FROM tournaments WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Tournament not found' });
    await db.query('DELETE FROM tournaments WHERE id = ?', [req.params.id]);
    await auditLog(req.user.id, 'DELETE', req.params.id, 'Deleted tournament: ' + rows[0].name);
    res.json({ success: true, message: 'Tournament deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── REGISTER TEAM ────────────────────────────────────────────
exports.registerTeam = async (req, res) => {
  try {
    const { team_id } = req.body;
    if (!team_id) return res.status(400).json({ success: false, message: 'team_id is required' });
    const [tournament] = await db.query('SELECT * FROM tournaments WHERE id = ?', [req.params.id]);
    if (!tournament.length) return res.status(404).json({ success: false, message: 'Tournament not found' });
    if (['completed', 'cancelled'].includes(tournament[0].status))
      return res.status(400).json({ success: false, message: 'Cannot register for a completed or cancelled tournament' });
    const [count] = await db.query(
      'SELECT COUNT(*) as cnt FROM tournament_registrations WHERE tournament_id = ?', [req.params.id]
    );
    if (count[0].cnt >= tournament[0].max_teams)
      return res.status(400).json({ success: false, message: 'Tournament is full' });
    await db.query(
      'INSERT INTO tournament_registrations (tournament_id, team_id) VALUES (?, ?)',
      [req.params.id, team_id]
    );
    await auditLog(req.user.id, 'REGISTER', req.params.id, 'Registered team ' + team_id);
    res.json({ success: true, message: 'Team registered successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Team already registered' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UNREGISTER TEAM ──────────────────────────────────────────
exports.unregisterTeam = async (req, res) => {
  try {
    const { team_id } = req.body;
    await db.query(
      'DELETE FROM tournament_registrations WHERE tournament_id = ? AND team_id = ?',
      [req.params.id, team_id]
    );
    res.json({ success: true, message: 'Team unregistered' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── STANDINGS ────────────────────────────────────────────────
exports.getStandings = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM tournament_standings WHERE tournament_id = ?', [req.params.id]
    );
    res.json({ success: true, standings: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const db = require('../config/db');

const auditLog = async (db, userId, action, entityType, entityId, description, oldVals, newVals) => {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId, oldVals ? JSON.stringify(oldVals) : null, newVals ? JSON.stringify(newVals) : null, description]
    );
  } catch (_) { /* audit log failure must never break main flow */ }
};

// ── GET ALL MATCHES ──────────────────────────────────────────
exports.getMatches = async (req, res) => {
  try {
    const { tournament_id, status, team_id } = req.query;
    let query = `SELECT m.*,
      t1.name as team1_name, t1.logo as team1_logo,
      t2.name as team2_name, t2.logo as team2_logo,
      w.name as winner_name,
      t.name as tournament_name
      FROM matches m
      JOIN teams t1 ON m.team1_id = t1.id
      JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN teams w ON m.winner_id = w.id
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE 1=1`;
    const params = [];
    if (tournament_id) { query += ' AND m.tournament_id = ?'; params.push(tournament_id); }
    if (status)        { query += ' AND m.status = ?';        params.push(status);        }
    if (team_id)       { query += ' AND (m.team1_id = ? OR m.team2_id = ?)'; params.push(team_id, team_id); }
    query += ' ORDER BY m.match_date ASC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, matches: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET SINGLE MATCH ─────────────────────────────────────────
exports.getMatch = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, t1.name as team1_name, t2.name as team2_name, w.name as winner_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.id
       JOIN teams t2 ON m.team2_id = t2.id
       LEFT JOIN teams w ON m.winner_id = w.id
       WHERE m.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, match: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE MATCH ─────────────────────────────────────────────
exports.createMatch = async (req, res) => {
  try {
    const { tournament_id, team1_id, team2_id, match_date, venue, round_number, match_number } = req.body;
    if (!tournament_id || !team1_id || !team2_id || !match_date)
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    if (String(team1_id) === String(team2_id))
      return res.status(400).json({ success: false, message: 'Teams must be different' });

    const [result] = await db.query(
      `INSERT INTO matches (tournament_id, team1_id, team2_id, match_date, venue, round_number, match_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tournament_id, team1_id, team2_id, match_date, venue || '', round_number || 1, match_number || 1]
    );
    if (req.user) await auditLog(db, req.user.id, 'CREATE', 'match', result.insertId, `Scheduled match: team ${team1_id} vs team ${team2_id}`);
    res.status(201).json({ success: true, message: 'Match scheduled', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE MATCH DETAILS (schedule) ──────────────────────────
exports.updateMatch = async (req, res) => {
  try {
    const { team1_id, team2_id, match_date, venue, round_number, match_number } = req.body;
    const [rows] = await db.query('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Match not found' });
    const m = rows[0];
    await db.query(
      `UPDATE matches SET team1_id=?, team2_id=?, match_date=?, venue=?, round_number=?, match_number=? WHERE id=?`,
      [team1_id || m.team1_id, team2_id || m.team2_id, match_date || m.match_date,
       venue !== undefined ? venue : m.venue, round_number || m.round_number, match_number || m.match_number, req.params.id]
    );
    if (req.user) await auditLog(db, req.user.id, 'UPDATE', 'match', req.params.id, 'Updated match schedule');
    res.json({ success: true, message: 'Match updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE MATCH RESULT (uses transaction + DB trigger handles stats) ────
exports.updateMatchResult = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { team1_score, team2_score, status, notes } = req.body;
    const [rows] = await conn.query('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ success: false, message: 'Match not found' }); }

    const match = rows[0];

    if (status === 'cancelled' && !['scheduled', 'ongoing'].includes(match.status)) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Only scheduled or ongoing matches can be cancelled' });
    }

    let winner_id = null;
    if (status === 'completed') {
      const s1 = parseInt(team1_score) || 0;
      const s2 = parseInt(team2_score) || 0;
      if (s1 > s2) winner_id = match.team1_id;
      else if (s2 > s1) winner_id = match.team2_id;
    }

    const oldVals = { status: match.status, team1_score: match.team1_score, team2_score: match.team2_score, winner_id: match.winner_id };

    // The DB TRIGGER after_match_result_update fires automatically here
    await conn.query(
      'UPDATE matches SET team1_score=?, team2_score=?, winner_id=?, status=?, notes=? WHERE id=?',
      [parseInt(team1_score) || 0, parseInt(team2_score) || 0, winner_id, status, notes || null, req.params.id]
    );

    await conn.commit();
    if (req.user) await auditLog(db, req.user.id, 'UPDATE_RESULT', 'match', req.params.id,
      `Result: ${team1_score}-${team2_score} (${status})`, oldVals, { status, team1_score, team2_score, winner_id });

    res.json({ success: true, message: 'Match result updated. Stats auto-updated by DB trigger.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// ── CANCEL MATCH ─────────────────────────────────────────────
exports.cancelMatch = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Match not found' });
    if (!['scheduled', 'ongoing'].includes(rows[0].status))
      return res.status(400).json({ success: false, message: 'Only scheduled or ongoing matches can be cancelled' });

    await db.query('UPDATE matches SET status = ? WHERE id = ?', ['cancelled', req.params.id]);
    if (req.user) await auditLog(db, req.user.id, 'CANCEL', 'match', req.params.id, 'Match cancelled');
    res.json({ success: true, message: 'Match cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE MATCH ─────────────────────────────────────────────
exports.deleteMatch = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ success: false, message: 'Match not found' }); }
    const match = rows[0];

    // Manually reverse stats if completed (triggers don't fire on DELETE)
    if (match.status === 'completed') {
      if (match.winner_id) {
        const loserId = match.winner_id === match.team1_id ? match.team2_id : match.team1_id;
        await conn.query('UPDATE teams SET wins = GREATEST(wins-1,0), points = GREATEST(points-3,0) WHERE id = ?', [match.winner_id]);
        await conn.query('UPDATE teams SET losses = GREATEST(losses-1,0) WHERE id = ?', [loserId]);
      } else {
        await conn.query('UPDATE teams SET draws = GREATEST(draws-1,0), points = GREATEST(points-1,0) WHERE id IN (?,?)', [match.team1_id, match.team2_id]);
      }
    }

    await conn.query('DELETE FROM matches WHERE id = ?', [req.params.id]);
    await conn.commit();
    if (req.user) await auditLog(db, req.user.id, 'DELETE', 'match', req.params.id, 'Match deleted');
    res.json({ success: true, message: 'Match deleted' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// ── GENERATE FIXTURES ─────────────────────────────────────────
exports.generateFixtures = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { start_date, venue } = req.body;
    const tournId = req.params.id;

    const [tournament] = await conn.query('SELECT * FROM tournaments WHERE id = ?', [tournId]);
    if (!tournament.length) { await conn.rollback(); return res.status(404).json({ success: false, message: 'Tournament not found' }); }

    const [teams] = await conn.query(
      'SELECT team_id FROM tournament_registrations WHERE tournament_id = ? AND status = "approved" ORDER BY registered_at',
      [tournId]
    );
    if (teams.length < 2) { await conn.rollback(); return res.status(400).json({ success: false, message: 'Need at least 2 teams' }); }

    await conn.query('DELETE FROM matches WHERE tournament_id = ? AND status = "scheduled"', [tournId]);

    const format = tournament[0].format;
    const teamIds = teams.map(t => t.team_id);
    const baseDate = new Date(start_date || tournament[0].start_date);
    const matchVenue = venue || '';
    let matchNum = 1;
    const toInsert = [];

    const fmtDate = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

    if (format === 'round_robin' || format === 'league') {
      let d = new Date(baseDate);
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          toInsert.push([tournId, teamIds[i], teamIds[j], fmtDate(d), matchVenue, 1, matchNum++]);
          d = new Date(d.getTime() + 86400000);
        }
      }
    } else {
      const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
      let d = new Date(baseDate);
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        toInsert.push([tournId, shuffled[i], shuffled[i + 1], fmtDate(d), matchVenue, 1, matchNum++]);
        d = new Date(d.getTime() + 86400000);
      }
    }

    if (toInsert.length > 0) {
      await conn.query(
        'INSERT INTO matches (tournament_id, team1_id, team2_id, match_date, venue, round_number, match_number) VALUES ?',
        [toInsert]
      );
    }

    await conn.commit();
    if (req.user) await auditLog(db, req.user.id, 'GENERATE_FIXTURES', 'tournament', tournId, `Generated ${toInsert.length} fixtures`);
    res.json({ success: true, message: `Generated ${toInsert.length} fixtures successfully`, count: toInsert.length });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// ── TEAM MATCH SUGGESTIONS ────────────────────────────────────
exports.getTeamSuggestions = async (req, res) => {
  try {
    const [rows] = await db.query('CALL GetTeamMatchSuggestions(?)', [req.params.teamId]);
    res.json({ success: true, suggestions: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET AUDIT LOG ─────────────────────────────────────────────
exports.getAuditLog = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.username FROM audit_log a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC LIMIT 100`
    );
    res.json({ success: true, logs: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

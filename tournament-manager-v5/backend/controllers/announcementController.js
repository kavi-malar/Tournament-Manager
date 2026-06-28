const db = require('../config/db');

// GET announcements for a tournament
exports.getAnnouncements = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.username as author_name
       FROM tournament_announcements a
       JOIN users u ON a.author_id = u.id
       WHERE a.tournament_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, announcements: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message)
      return res.status(400).json({ success: false, message: 'Title and message required' });

    const [result] = await db.query(
      `INSERT INTO tournament_announcements (tournament_id, author_id, title, message) VALUES (?, ?, ?, ?)`,
      [req.params.id, req.user.id, title, message]
    );

    // Notify all registered team members
    try {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
         SELECT DISTINCT tm.user_id, 'announcement',
           CONCAT('📢 Tournament Announcement'),
           ?,
           'tournament', ?
         FROM tournament_registrations tr
         JOIN team_members tm ON tr.team_id = tm.team_id
         WHERE tr.tournament_id = ? AND tm.user_id != ?`,
        [message.substring(0, 200), req.params.id, req.params.id, req.user.id]
      );
    } catch (_) {}

    res.status(201).json({ success: true, message: 'Announcement posted', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT author_id FROM tournament_announcements WHERE id = ? AND tournament_id = ?`,
      [req.params.announcementId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Announcement not found' });
    if (parseInt(rows[0].author_id) !== parseInt(req.user.id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    await db.query('DELETE FROM tournament_announcements WHERE id = ?', [req.params.announcementId]);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

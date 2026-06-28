const db = require('../config/db');

// Get notifications for current user
exports.getNotifications = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unread = rows.filter(n => !n.is_read).length;
    res.json({ success: true, notifications: rows, unread_count: unread });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mark notification as read
exports.markRead = async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mark all as read
exports.markAllRead = async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = ?`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    await db.query(
      `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

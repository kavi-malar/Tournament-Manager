const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// Register
exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, message: 'All fields required' });

    const [existing] = await db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length) return res.status(409).json({ success: false, message: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const userRole = role === 'organizer' ? 'organizer' : 'player';
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashed, userRole]
    );

    const token = generateToken(result.insertId);
    res.status(201).json({ success: true, token, user: { id: result.insertId, username, email, role: userRole } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user.id);
    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.role, u.created_at,
       t.id as team_id, t.name as team_name
       FROM users u
       LEFT JOIN team_members tm ON u.id = tm.user_id
       LEFT JOIN teams t ON tm.team_id = t.id
       WHERE u.id = ?`, [req.user.id]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

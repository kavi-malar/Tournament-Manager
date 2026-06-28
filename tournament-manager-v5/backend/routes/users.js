const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/leaderboard', ctrl.getLeaderboard);
router.get('/h2h', ctrl.getHeadToHead);
router.get('/profile/:id', ctrl.getPlayerProfile);
router.get('/achievements/:id', ctrl.getAchievements);
router.put('/profile', protect, ctrl.updateProfile);

// Admin only - static routes BEFORE param routes
router.get('/audit-log', protect, adminOnly, ctrl.getAuditLog);
router.get('/', protect, adminOnly, ctrl.getAllUsers);
router.put('/:id/role', protect, adminOnly, ctrl.updateUserRole);
router.delete('/:id', protect, adminOnly, ctrl.deleteUser);

module.exports = router;

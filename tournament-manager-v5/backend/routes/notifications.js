const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, ctrl.getNotifications);
// Static routes before param routes
router.put('/read-all', protect, ctrl.markAllRead);
router.put('/:id/read', protect, ctrl.markRead);
router.delete('/:id', protect, ctrl.deleteNotification);

module.exports = router;

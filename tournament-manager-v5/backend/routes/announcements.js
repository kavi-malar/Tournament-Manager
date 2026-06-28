const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/announcementController');
const { protect, organizerOrAdmin } = require('../middleware/auth');

router.get('/', ctrl.getAnnouncements);
router.post('/', protect, organizerOrAdmin, ctrl.createAnnouncement);
router.delete('/:announcementId', protect, organizerOrAdmin, ctrl.deleteAnnouncement);

module.exports = router;

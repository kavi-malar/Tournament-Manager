const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/matchController');
const { protect, organizerOrAdmin } = require('../middleware/auth');

router.get('/', ctrl.getMatches);
router.get('/audit', protect, organizerOrAdmin, ctrl.getAuditLog);
router.get('/:id', ctrl.getMatch);
router.post('/', protect, organizerOrAdmin, ctrl.createMatch);
router.put('/:id', protect, organizerOrAdmin, ctrl.updateMatch);
router.put('/:id/result', protect, organizerOrAdmin, ctrl.updateMatchResult);
router.put('/:id/cancel', protect, organizerOrAdmin, ctrl.cancelMatch);
router.delete('/:id', protect, organizerOrAdmin, ctrl.deleteMatch);

module.exports = router;

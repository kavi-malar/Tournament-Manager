const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tournamentController');
const matchCtrl = require('../controllers/matchController');
const { protect, organizerOrAdmin, adminOnly } = require('../middleware/auth');

router.get('/', ctrl.getAllTournaments);
router.get('/:id', ctrl.getTournament);
router.get('/:id/standings', ctrl.getStandings);
router.post('/', protect, organizerOrAdmin, ctrl.createTournament);
router.put('/:id', protect, organizerOrAdmin, ctrl.updateTournament);
router.delete('/:id', protect, adminOnly, ctrl.deleteTournament);
router.post('/:id/register', protect, ctrl.registerTeam);
router.delete('/:id/unregister', protect, ctrl.unregisterTeam);
router.post('/:id/generate-fixtures', protect, organizerOrAdmin, matchCtrl.generateFixtures);

module.exports = router;

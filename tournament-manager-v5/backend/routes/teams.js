const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/teamController');
const { protect } = require('../middleware/auth');

router.get('/', ctrl.getAllTeams);
router.get('/my', protect, ctrl.getMyTeams);
router.get('/:id', ctrl.getTeam);
router.post('/', protect, ctrl.createTeam);
router.put('/:id', protect, ctrl.updateTeam);
router.delete('/:id', protect, ctrl.deleteTeam);
router.post('/:id/members', protect, ctrl.addMember);
router.delete('/:id/members/:userId', protect, ctrl.removeMember);

module.exports = router;

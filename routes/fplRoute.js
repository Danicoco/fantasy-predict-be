const express = require('express');
const router = express.Router();
const fplController = require('../controller/FplController/fplController');
const verify = require('../middleware/authMiddleWare');

router.post('/create-club', verify, fplController.createClub);
router.get('/get-All-Club', verify, fplController.getAllClubs);
router.get('/get-All-Fixtures', verify, fplController.getAllFixtures);
router.get('/get-fixtures', fplController.fetchAndModifyFixtures);
router.get('/get-fixtures-gameweek', fplController.fetchAndModifyFixturesByGameWeek);
router.get('/matches/:kickoffTime', fplController.getMatchesByKickoffTime);
router.get('/fixtureId/:id', fplController.getMatchesById);
router.get('/event/:event', fplController.getFixturesByEvent);
router.get('/fixture/current-week-event', fplController.getCurrentWeekEvent);
router.get('/fixture/current-fixtures', fplController.getCurrentFixtures);
router.get('/fixture/upcoming-fixtures', fplController.getUpcomingFixtures);
router.get('/fixture/live-or-ended-fixtures', fplController.getLiveOrEndedFixtures);


module.exports = router;
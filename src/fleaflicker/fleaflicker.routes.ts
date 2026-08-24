import { FleaflickerController } from '#fleaflicker/fleaflicker.controller.js';
import { FleaflickerService } from '#fleaflicker/fleaflicker.service.js';
import express from 'express';

const router = express.Router();
const fleaflickerService = new FleaflickerService();
const fleaflickerController = new FleaflickerController(fleaflickerService);

router.get('/roster/:leagueId/:teamId', fleaflickerController.getRoster);
router.get('/standings/:leagueId', fleaflickerController.getStandings);
router.get('/boxscore/:leagueId', fleaflickerController.getBoxscore);
router.post('/info', fleaflickerController.setFleaflickerInfo);
router.delete('/info', fleaflickerController.deleteFleaflickerInfo);

export default router;

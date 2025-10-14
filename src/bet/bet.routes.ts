import { BetController } from "#bet/bet.controller.js";
import { BetService } from "#bet/bet.service.js";
import { MatchService } from "#match/match.service.js";
import { TeamService } from "#team/team.service.js";
import { UserService } from "#user/user.service.js";
import express from "express";

const router = express.Router();
const matchService = new MatchService();
const betService = new BetService();
const userService = new UserService();
const teamService = new TeamService();
const betController = new BetController(betService, matchService, userService, teamService);

router.post("/update/extra", betController.updateExtra);
router.post("/update", betController.update);
router.get("/extra/results", betController.getExtrasResults);
router.get("/extra", betController.getExtras);

export default router;

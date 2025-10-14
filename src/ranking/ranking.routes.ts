import { BetService } from "#bet/bet.service.js";
import { MatchService } from "#match/match.service.js";
import { RankingController } from "#ranking/ranking.controller.js";
import { TeamService } from "#team/team.service.js";
import { UserService } from "#user/user.service.js";
import express from "express";

const router = express.Router();

const userService = new UserService();
const matchService = new MatchService();
const teamService = new TeamService();
const betService = new BetService();

const rankingController = new RankingController(userService, matchService, teamService, betService);

router.get("/season/", rankingController.getRanking);
router.get("/season/:season", rankingController.getRanking);

export default router;

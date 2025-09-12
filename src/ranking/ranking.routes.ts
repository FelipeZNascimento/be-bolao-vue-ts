import { BetService } from "#bet/bet.service.ts";
import { MatchService } from "#match/match.service.ts";
import { TeamService } from "#team/team.service.ts";
import { UserService } from "#user/user.service.ts";
import express from "express";

import { RankingController } from "./ranking.controller.ts";
import { RankingService } from "./ranking.service.ts";

const router = express.Router();

const userService = new UserService();
const rankingService = new RankingService();
const matchService = new MatchService();
const teamService = new TeamService();
const betService = new BetService();

const rankingController = new RankingController(rankingService, userService, matchService, teamService, betService);

router.get("/season/", rankingController.getSeason);
router.get("/season/:season", rankingController.getSeason);

export default router;

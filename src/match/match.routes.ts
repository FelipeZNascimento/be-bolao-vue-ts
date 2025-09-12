import { BetService } from "#bet/bet.service.ts";
import { TeamService } from "#team/team.service.ts";
import { UserService } from "#user/user.service.ts";
import express from "express";

import { MatchController } from "./match.controller.ts";
import { MatchService } from "./match.service.ts";

const router = express.Router();
const matchService = new MatchService();
const userService = new UserService();
const betService = new BetService();
const teamService = new TeamService();

const matchController = new MatchController(matchService, userService, betService, teamService);

router.get("/", matchController.getBySeasonWeek);
router.get("/:season/:week", matchController.getBySeasonWeek);

router.post("/update/:key", matchController.updateFromKey);

export default router;

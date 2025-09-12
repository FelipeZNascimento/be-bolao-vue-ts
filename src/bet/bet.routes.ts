import { MatchService } from "#match/match.service.ts";
import { TeamService } from "#team/team.service.ts";
import { UserService } from "#user/user.service.ts";
import express from "express";

import { BetController } from "./bet.controller.ts";
import { BetService } from "./bet.service.ts";

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

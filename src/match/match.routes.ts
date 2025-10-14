import { BetService } from "#bet/bet.service.js";
import { MatchController } from "#match/match.controller.js";
import { MatchService } from "#match/match.service.js";
import { TeamService } from "#team/team.service.js";
import { UserService } from "#user/user.service.js";
import { WebSocketService } from "#websocket/websocket.service.js";
import express from "express";

const router = express.Router();

const websocketInstance = WebSocketService.getInstance();
const matchService = new MatchService();
const userService = new UserService();
const betService = new BetService();
const teamService = new TeamService();

const matchController = new MatchController(matchService, userService, betService, teamService, websocketInstance);

router.get("/", matchController.getBySeasonWeek);
router.get("/:season/:week", matchController.getBySeasonWeek);

router.post("/update/:key", matchController.updateFromKey);

export default router;

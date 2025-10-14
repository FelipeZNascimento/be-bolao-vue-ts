import { MatchService } from "#match/match.service.js";
import { SeasonController } from "#season/season.controller.js";
import express from "express";

const router = express.Router();

const matchService = new MatchService();

const seasonController = new SeasonController(matchService);

router.get("/current/", seasonController.getCurrentSeasonAndWeek);

export default router;

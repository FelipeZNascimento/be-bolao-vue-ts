import { MatchService } from "#match/match.service.ts";
import express from "express";

import { SeasonController } from "./season.controller.ts";

const router = express.Router();

const matchService = new MatchService();

const seasonController = new SeasonController(matchService);

router.get("/current/", seasonController.getCurrentSeasonAndWeek);

export default router;

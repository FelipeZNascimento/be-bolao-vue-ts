import express from "express";

import { MatchController } from "./match.controller.ts";
import { MatchService } from "./match.service.ts";

const router = express.Router();
const matchService = new MatchService();
const matchController = new MatchController(matchService);

router.get("/:season/:week", matchController.getBySeasonWeek);

export default router;

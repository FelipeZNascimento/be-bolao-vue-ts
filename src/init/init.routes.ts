import { TeamService } from "#team/team.service.ts";
import express from "express";

import { InitController } from "./init.controller.ts";
import { InitService } from "./init.service.ts";

const router = express.Router();
const initService = new InitService();
const teamService = new TeamService();
const initController = new InitController(initService, teamService);

router.get("/", initController.getInfo);

export default router;

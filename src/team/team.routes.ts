import express from "express";

import { TeamController } from "./team.controller.ts";
import { TeamService } from "./team.service.ts";

const router = express.Router();
const teamService = new TeamService();
const teamController = new TeamController(teamService);

router.get("/", teamController.getAll);
router.get("/conferenceAndDivision", teamController.getByConferenceAndDivision);

export default router;

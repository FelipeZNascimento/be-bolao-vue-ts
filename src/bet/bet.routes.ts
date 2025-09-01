import express from "express";

import { BetController } from "./bet.controller.ts";
import { BetService } from "./bet.service.ts";

const router = express.Router();
const betService = new BetService();
const betController = new BetController(betService);

router.get("/extra", betController.getExtras);

export default router;

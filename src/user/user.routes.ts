import express from "express";

import { UserController } from "./user.controller.ts";
import { UserService } from "./user.service.ts";

const router = express.Router();
const userService = new UserService();
const userController = new UserController(userService);

router.get("/", userController.getAll);

export default router;

import express from "express";

import { UserController } from "./user.controller.ts";
import { UserService } from "./user.service.ts";

const router = express.Router();
const userService = new UserService();
const userController = new UserController(userService);

// Post routes
router.post("/login", userController.login);
router.post("/register", userController.register);
router.post("/profile", userController.updateProfile);
router.post("/preferences", userController.updatePreferences);
router.post("/password", userController.updatePassword);

// Get routes
router.get("/logout", userController.logout);
router.get("/activeProfile", userController.getActiveProfile);
router.get("/:userId", userController.getById);
router.get("/", userController.getAll);

export default router;

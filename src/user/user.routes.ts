import { MailerService } from "#mailer/mailer.service.ts";
import express from "express";

import { UserController } from "./user.controller.ts";
import { UserService } from "./user.service.ts";

const router = express.Router();
const userService = new UserService();
const mailerService = new MailerService();
const userController = new UserController(userService, mailerService);

// Post routes
router.post("/login", userController.login);
router.post("/register", userController.register);
router.post("/profile", userController.updateProfile);
router.post("/preferences", userController.updatePreferences);
router.post("/password", userController.updatePassword);
router.post("/password-token", userController.updatePasswordFromToken);
router.post("/forgot-password", userController.forgotPassword);

// Get routes
router.get("/logout", userController.logout);
router.get("/activeProfile", userController.getActiveProfile);
router.get("/:userId", userController.getById);
router.get("/", userController.getAll);

export default router;

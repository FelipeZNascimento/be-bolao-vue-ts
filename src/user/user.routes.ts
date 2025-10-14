import { MailerService } from "#mailer/mailer.service.js";
import { UserController } from "#user/user.controller.js";
import { UserService } from "#user/user.service.js";
import express from "express";

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

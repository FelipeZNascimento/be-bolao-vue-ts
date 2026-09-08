import { MailerService } from '#mailer/mailer.service.js';
import { requireAdmin, requireAuth } from '#middlewares/middlewares.js';
import { UserController } from '#user/user.controller.js';
import { UserService } from '#user/user.service.js';
import express from 'express';

const router = express.Router();
const userService = new UserService();
const mailerService = new MailerService();
const userController = new UserController(userService, mailerService);

// Public routes
router.post('/login', userController.login);
router.post('/register', userController.register);
router.post('/password-token', userController.updatePasswordFromToken);
router.post('/forgot-password', userController.forgotPassword);
router.get('/logout', userController.logout);

// Logged-in user routes
router.post('/profile', requireAuth, userController.updateProfile);
router.post('/preferences', requireAuth, userController.updatePreferences);
router.post('/password', requireAuth, userController.updatePassword);
router.get('/activeProfile', requireAuth, userController.getActiveProfile);
router.get('/season-register', requireAuth, userController.registerToCurrentSeason);

// Favorites routes
router.get('/favorites', requireAuth, userController.getFavorites);
router.post('/favorites', requireAuth, userController.updateFavorites);

// Admin routes
router.get('/admin/', requireAdmin, userController.getAdmin);
router.get('/admin/toggle-active-status/:userId', requireAdmin, userController.toggleActiveStatus);
router.post('/admin/update-balance/:userId', requireAdmin, userController.updateBalance);

// Records
router.get('/records/seasons', userController.getSeasonsRecords);
router.get('/records/:userId', userController.getRecords);

export default router;

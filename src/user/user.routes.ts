import { MailerService } from '#mailer/mailer.service.js';
import { UserController } from '#user/user.controller.js';
import { UserService } from '#user/user.service.js';
import express from 'express';

const router = express.Router();
const userService = new UserService();
const mailerService = new MailerService();
const userController = new UserController(userService, mailerService);

// Login/Register routes
router.post('/login', userController.login);
router.post('/register', userController.register);
router.post('/profile', userController.updateProfile);
router.post('/preferences', userController.updatePreferences);
router.post('/password', userController.updatePassword);
router.post('/password-token', userController.updatePasswordFromToken);
router.post('/forgot-password', userController.forgotPassword);
router.get('/logout', userController.logout);
router.get('/activeProfile', userController.getActiveProfile);
router.get('/season-register', userController.registerToCurrentSeason);

// Favorites routes
router.get('/favorites', userController.getFavorites);
router.post('/favorites', userController.updateFavorites);

// Admin routes
router.get('/admin/', userController.getAdmin);
router.get('/admin/toggle-active-status/:userId', userController.toggleActiveStatus);

// Records
router.get('/records/seasons', userController.getSeasonsRecords);
router.get('/records/:userId', userController.getRecords);

router.get('/:userId', userController.getById);
router.get('/', userController.getAll);

export default router;

import { MailerService } from '#mailer/mailer.service.js';
import { UserController } from '#user/user.controller.js';
import { UserService } from '#user/user.service.js';
import express from 'express';

const router = express.Router();
const userService = new UserService();
const mailerService = new MailerService();
const userController = new UserController(userService, mailerService);

router.get('/', userController.getAdmin);
router.get('/toggle-active-status/:userId', userController.toggleActiveStatus);
router.post('/update-balance/:userId', userController.updateBalance);

export default router;

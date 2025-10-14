import type { IUser } from "#user/user.types.js";

import { MailerService } from "#mailer/mailer.service.js";
import { BaseController } from "#shared/base.controller.js";
import { UserService } from "#user/user.service.js";
import { checkExistingEntries, generateVerificationToken, validateEmail } from "#user/user.utils.js";
import { isRejected } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";
import { cachedInfo } from "#utils/dataCache.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { NextFunction, Request, Response } from "express";

// Extend express-session types to include 'user' property
declare module "express-session" {
  interface SessionData {
    user: IUser | null;
  }
}

export class UserController extends BaseController {
  constructor(
    private userService: UserService,
    private mailerService: MailerService,
  ) {
    super();
  }

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const reqBody = req.body as { email: string };
      const { email } = reqBody;

      if (!email) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const resetToken = generateVerificationToken();
      cachedInfo.set(`PASSWORD_RESET_${email}`, resetToken, 60 * 60); // 60 minutes expiration

      await this.mailerService.sendPasswordResetEmail(email, "", resetToken);
    });
  };

  getActiveProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;

      if (!user) {
        return null;
      }

      const userResponse: IUser = await this.userService.getById(user.id);
      return userResponse;
    });
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = process.env.SEASON;
      if (!season) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const response: IUser[] = await this.userService.getBySeason(parseInt(season));
      return response;
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = process.env.SEASON;
      const userId = req.params.userId;
      if (!season) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      if (!userId) {
        const response: IUser[] = await this.userService.getBySeason(parseInt(season));
        return response;
      } else {
        const response: IUser = await this.userService.getById(parseInt(userId));
        return response;
      }
    });
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (req.session.user) {
        return req.session.user;
      }
      const reqBody = req.body as { email: string; password: string };
      const { email, password } = reqBody;

      if (!email || !password) {
        throw new AppError("Credenciais inválidas", 401, ErrorCode.UNAUTHORIZED);
      }

      const response: IUser[] = await this.userService.login(email, password);
      if (response.length > 0) {
        const user: IUser | null = response[0];
        req.session.user = user;
        await this.userService.updateLastOnlineTime(user.id);
        return user;
      } else {
        throw new AppError("Credenciais inválidas", 401, ErrorCode.UNAUTHORIZED);
      }
    });
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      await this.userService.updateLastOnlineTime(req.session.user?.id ?? 0);

      req.session.user = null;
      req.session.save(function (err) {
        if (err) next(err);

        // regenerate the session, which is good practice to help
        // guard against forms of session fixation
        req.session.regenerate(function (err) {
          if (err) next(err);
        });
      });

      return;
    });
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = req.params.season || process.env.SEASON;

      if (!season) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const reqBody = req.body as {
        color: string;
        email: string;
        fullName: string;
        icon: string;
        name: string;
        password: string;
      };
      const { color, email, fullName, icon, name, password } = reqBody;

      if (!email || !password || !name || !fullName) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const isValid = await checkExistingEntries(this.userService, email, name);
      if (!isValid) {
        throw new AppError("Email ou nome já registrado", 409, ErrorCode.VALIDATION_ERROR);
      }

      const registerResponse = await this.userService.register(email, fullName, name, password);
      if (registerResponse.affectedRows === 0) {
        throw new AppError("Registro falhou", 500, ErrorCode.DB_ERROR);
      }

      const { insertId } = registerResponse;
      const [setOnCurrentSeasonResponse, setIconsResponse] = await Promise.allSettled([
        this.userService.setOnCurrentSeason(parseInt(season), insertId),
        this.userService.setIcons(insertId, icon, color),
      ]);

      if (isRejected(setOnCurrentSeasonResponse) || isRejected(setIconsResponse)) {
        throw new AppError("Base de dados inacessível", 204, ErrorCode.DB_ERROR);
      }

      const loginResponse: IUser[] = await this.userService.login(email, password);

      if (loginResponse.length > 0) {
        req.session.user = loginResponse[0];
        void this.userService.updateLastOnlineTime(loginResponse[0].id);
        return loginResponse[0];
      }

      return;
    });
  };

  updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.session.user) {
        throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
      }

      const user = req.session.user;
      const reqBody = req.body as { currentPassword: string; newPassword: string };
      const { currentPassword, newPassword } = reqBody;

      if (!currentPassword || !newPassword) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      void this.userService.updateLastOnlineTime(user.id);

      const updatePasswordResponse = await this.userService.updatePassword(currentPassword, newPassword, user.id);
      if (updatePasswordResponse.affectedRows === 0) {
        throw new AppError("Senha incorreta", 409, ErrorCode.VALIDATION_ERROR);
      }

      return;
    });
  };

  updatePasswordFromToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const reqBody = req.body as { email: string; newPassword: string; token: string };
      const { email, newPassword, token } = reqBody;

      if (!email || !token || !newPassword) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      // void this.userService.updateLastOnlineTime(user.id);
      const cachedToken = cachedInfo.get(`PASSWORD_RESET_${email}`);
      if (cachedToken !== token) {
        throw new AppError("Token inválido ou expirado", 409, ErrorCode.VALIDATION_ERROR);
      }

      const user = await this.userService.getByEmail(email);

      cachedInfo.del(`PASSWORD_RESET_${email}`);
      return await this.userService.updatePasswordFromToken(newPassword, user.id);
    });
  };

  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.session.user) {
        throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
      }

      const user = req.session.user;

      void this.userService.updateLastOnlineTime(user.id);

      const reqBody = req.body as { color: string; icon: string };
      const { color, icon } = reqBody;
      await this.userService.setIcons(user.id, color, icon);
      return await this.userService.getById(user.id);
    });
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.session.user) {
        throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
      }

      const user = req.session.user;
      void this.userService.updateLastOnlineTime(user.id);

      const reqBody = req.body as { email: string; name: string; username: string };
      const { email, name, username } = reqBody;

      if (!email || !name || !username) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      if (!validateEmail(email)) {
        throw new AppError("Email inválido", 409, ErrorCode.VALIDATION_ERROR);
      }

      const isValid = await checkExistingEntries(this.userService, email, username, user.id);
      if (!isValid) {
        throw new AppError("Email ou nome de usuário já em uso", 409, ErrorCode.VALIDATION_ERROR);
      }

      await this.userService.updateProfile(email, name, username, user.id);
      return await this.userService.getById(user.id);
    });
  };
}

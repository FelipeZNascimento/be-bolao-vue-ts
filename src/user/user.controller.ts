import type { IUser } from '#user/user.types.js';

import { MailerService } from '#mailer/mailer.service.js';
import { BaseController } from '#shared/base.controller.js';
import { UserService } from '#user/user.service.js';
import { checkExistingEntries, generateVerificationToken, validateEmail } from '#user/user.utils.js';
import { isRejected } from '#utils/apiResponse.js';
import { AppError } from '#utils/appError.js';
import { cachedInfo } from '#utils/dataCache.js';
import { ErrorCode } from '#utils/errorCodes.js';
import { validateRequestBody, validateRequestParams } from '#utils/requestValidation.utils.js';
import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

// Extend express-session types to include 'user' property
declare module 'express-session' {
  interface SessionData {
    user: IUser | null;
  }
}

const forgotPasswordSchema = z.object({
  email: z.string()
});

const getByIdParamsSchema = z.object({
  userId: z.string().optional()
});

const registerSchema = z.object({
  color: z.string().optional(),
  email: z.string(),
  fullName: z.string(),
  icon: z.string().optional(),
  name: z.string(),
  password: z.string()
});

const updateFavoritesSchema = z.object({
  favorites: z.array(z.string())
});

const updatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string()
});

const updatePasswordFromTokenSchema = z.object({
  email: z.string(),
  password: z.string(),
  token: z.string()
});

const updatePreferencesSchema = z.object({
  color: z.string(),
  icon: z.string()
});

const updateProfileSchema = z.object({
  email: z.string(),
  name: z.string(),
  username: z.string()
});

export class UserController extends BaseController {
  constructor(
    private userService: UserService,
    private mailerService: MailerService
  ) {
    super();
  }

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { email } = validateRequestBody(forgotPasswordSchema, req.body);

      const resetToken = generateVerificationToken();
      cachedInfo.set(`PASSWORD_RESET_${email}`, resetToken, 60 * 60); // 60 minutes expiration

      await this.mailerService.sendPasswordResetEmail(email, '', resetToken);
    });
  };

  getActiveProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const user = req.session.user;

      if (!user) {
        return null;
      }

      const { fleaflickerLeagueId, fleaflickerTeamId, ...userResponse } = await this.userService.getById(user.id);
      const favorites = await this.userService.getFavorites(user.id);

      const parsedUser = {
        ...userResponse,
        fleaflicker:
          fleaflickerLeagueId && fleaflickerTeamId
            ? { leagueId: fleaflickerLeagueId, teamId: fleaflickerTeamId }
            : null,
        favorites
      };

      return parsedUser;
    });
  };

  registerToCurrentSeason = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = process.env.SEASON;
      if (!season) {
        throw new AppError('Campo obrigatório ausente', 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const user = req.session.user;
      if (!user) {
        throw new AppError('Sem sessão ativa', 401, ErrorCode.UNAUTHORIZED);
      }

      const response = await this.userService.registerToCurrentSeason(user.id, season);
      if (!response || response.affectedRows === 0) {
        throw new AppError('Registro falhou', 500, ErrorCode.DB_ERROR);
      }

      console.log('registerToCurrentSeason', season, parseInt(season));
      console.log(req.session.user);
      req.session.user = { ...user, active: true, seasonId: parseInt(season) };
      console.log(req.session.user);
      return response;
    });
  };

  toggleActiveStatus = async (req: Request<{ userId: string }>, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = process.env.SEASON;
      const userId = req.params.userId;

      if (!season || !userId) {
        throw new AppError('Campo obrigatório ausente', 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const user = await this.userService.getById(parseInt(userId));
      await this.userService.updateUserActiveStatus(userId, parseInt(season), !user.active);
      return await this.userService.getAdmin(parseInt(season));
    });
  };

  getAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = process.env.SEASON;
      if (!season) {
        throw new AppError('Campo obrigatório ausente', 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      return await this.userService.getAdmin(parseInt(season));
    });
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = process.env.SEASON;
      if (!season) {
        throw new AppError('Campo obrigatório ausente', 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const response: IUser[] = await this.userService.getBySeason(parseInt(season));
      return response;
    });
  };

  getFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.session.user) {
        throw new AppError('Sem sessão ativa', 401, ErrorCode.UNAUTHORIZED);
      }

      const user = req.session.user;
      return await this.userService.getFavorites(user.id);
    });
  };

  getRecords = async (req: Request<{ userId: string }>, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const userId = req.params.userId;
      if (!userId) {
        throw new AppError('Campo obrigatório ausente', 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const cacheKey = `USER_RECORDS_${userId}`;
      const cachedRecords = cachedInfo.get(cacheKey);
      if (cachedRecords) {
        return cachedRecords;
      }

      const records = await this.userService.getUserRecords(parseInt(userId));
      cachedInfo.set(cacheKey, records, 60 * 60 * 24); // Cache for 24 hours

      return records;
    });
  };

  getSeasonsRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const cacheKey = 'SEASONS_RANKING_RECORDS';
      const cachedRecords = cachedInfo.get(cacheKey);
      if (cachedRecords) {
        return cachedRecords;
      }

      const records = await this.userService.getSeasonsRanking();
      cachedInfo.set(cacheKey, records, 60 * 60 * 24); // Cache for 24 hours

      return records;
    });
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = process.env.SEASON;
      const { userId } = validateRequestParams(getByIdParamsSchema, req.params);
      if (!season) {
        throw new AppError('Campo obrigatório ausente', 400, ErrorCode.MISSING_REQUIRED_FIELD);
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
        const favorites = await this.userService.getFavorites(req.session.user.id);
        return { ...req.session.user, favorites };
      }

      const reqBody = req.body as { email: string; password: string };
      const { email, password } = reqBody;

      if (!email || !password) {
        throw new AppError('Credenciais inválidas', 401, ErrorCode.UNAUTHORIZED);
      }

      const response = await this.userService.login(email);
      if (response.length === 0) {
        throw new AppError('Credenciais inválidas', 401, ErrorCode.UNAUTHORIZED);
      }

      const { password: hashedPassword, fleaflickerLeagueId, fleaflickerTeamId, ...user } = response[0];
      const isPasswordValid = await bcrypt.compare(password, hashedPassword);
      if (!isPasswordValid) {
        throw new AppError('Credenciais inválidas', 401, ErrorCode.UNAUTHORIZED);
      }

      const favorites = await this.userService.getFavorites(user.id);
      const parsedUser = {
        ...user,
        favorites,
        fleaflicker:
          fleaflickerLeagueId && fleaflickerTeamId ? { leagueId: fleaflickerLeagueId, teamId: fleaflickerTeamId } : null
      };

      req.session.user = parsedUser;
      return parsedUser;
    });
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
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

  register = async (req: Request<{ season: string }>, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = req.params.season || process.env.SEASON;

      if (!season) {
        throw new AppError('Campo obrigatório ausente', 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const { color, email, fullName, icon, name, password } = validateRequestBody(registerSchema, req.body);

      const isValid = await checkExistingEntries(this.userService, email, name);
      if (!isValid) {
        throw new AppError('Email ou nome já registrado', 409, ErrorCode.VALIDATION_ERROR);
      }

      const registerResponse = await this.userService.register(email, fullName, name, password);
      if (registerResponse.affectedRows === 0) {
        throw new AppError('Registro falhou', 500, ErrorCode.DB_ERROR);
      }

      const { insertId } = registerResponse;
      const [setOnCurrentSeasonResponse, setIconsResponse] = await Promise.allSettled([
        this.userService.setOnCurrentSeason(parseInt(season), insertId),
        this.userService.setIcons(insertId, icon ?? '', color ?? '')
      ]);

      if (isRejected(setOnCurrentSeasonResponse) || isRejected(setIconsResponse)) {
        throw new AppError('Base de dados inacessível', 204, ErrorCode.DB_ERROR);
      }

      const loginResponse = await this.userService.login(email);

      if (loginResponse.length > 0) {
        const { password: _hashedPassword, fleaflickerLeagueId, fleaflickerTeamId, ...user } = loginResponse[0];
        const userWithFleaflicker = {
          ...user,
          fleaflicker: { leagueId: fleaflickerLeagueId, teamId: fleaflickerTeamId }
        };

        req.session.user = userWithFleaflicker;
        const favorites = await this.userService.getFavorites(user.id);
        return { ...userWithFleaflicker, favorites };
      }

      return;
    });
  };

  updateFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.session.user) {
        throw new AppError('Sem sessão ativa', 401, ErrorCode.UNAUTHORIZED);
      }

      const user = req.session.user;
      const { favorites } = validateRequestBody(updateFavoritesSchema, req.body);

      await this.userService.updateFavorites(user.id, favorites);
      return await this.userService.getFavorites(user.id);
    });
  };

  updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.session.user) {
        throw new AppError('Sem sessão ativa', 401, ErrorCode.UNAUTHORIZED);
      }

      const user = req.session.user;
      const { currentPassword, newPassword } = validateRequestBody(updatePasswordSchema, req.body);

      const updatePasswordResponse = await this.userService.updatePassword(currentPassword, newPassword, user.id);
      if (!updatePasswordResponse || updatePasswordResponse.affectedRows === 0) {
        throw new AppError('Senha incorreta', 409, ErrorCode.VALIDATION_ERROR);
      }

      return;
    });
  };

  updatePasswordFromToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { email, password, token } = validateRequestBody(updatePasswordFromTokenSchema, req.body);

      const cachedToken = cachedInfo.get(`PASSWORD_RESET_${email}`);
      if (cachedToken !== token) {
        throw new AppError('Token inválido ou expirado', 409, ErrorCode.VALIDATION_ERROR);
      }

      const user = await this.userService.getByEmail(email);

      cachedInfo.del(`PASSWORD_RESET_${email}`);
      return await this.userService.updatePasswordFromToken(password, user.id);
    });
  };

  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.session.user) {
        throw new AppError('Sem sessão ativa', 401, ErrorCode.UNAUTHORIZED);
      }

      const user = req.session.user;

      const { color, icon } = validateRequestBody(updatePreferencesSchema, req.body);
      await this.userService.setIcons(user.id, color, icon);
      return await this.userService.getById(user.id);
    });
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.session.user) {
        throw new AppError('Sem sessão ativa', 401, ErrorCode.UNAUTHORIZED);
      }

      const user = req.session.user;

      const { email, name, username } = validateRequestBody(updateProfileSchema, req.body);

      if (!validateEmail(email)) {
        throw new AppError('Email inválido', 409, ErrorCode.VALIDATION_ERROR);
      }

      const isValid = await checkExistingEntries(this.userService, email, username, user.id);
      if (!isValid) {
        throw new AppError('Email ou nome de usuário já em uso', 409, ErrorCode.VALIDATION_ERROR);
      }

      await this.userService.updateProfile(email, name, username, user.id);
      return await this.userService.getById(user.id);
    });
  };
}

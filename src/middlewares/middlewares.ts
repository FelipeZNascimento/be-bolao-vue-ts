import { UserService } from '#user/user.service.js';
import { AppError } from '#utils/appError.js';
import { ErrorCode } from '#utils/errorCodes.js';
import { RequestHandler } from 'express';
import { NextFunction, Request, Response } from 'express';

interface CacheOptions {
  duration?: number;
  private?: boolean;
}

const userService = new UserService();

// Guards routes that must only ever be reached by an authenticated admin.
// Without it, the /user/admin/* routes run with no authorization check at all.
export const requireAdmin: RequestHandler = (req, _res, next) => {
  const user = req.session.user;
  if (!user) {
    return next(new AppError('Sem sessão ativa', 401, ErrorCode.UNAUTHORIZED));
  }
  if (!user.admin) {
    return next(new AppError('Não autorizado', 403, ErrorCode.FORBIDDEN));
  }
  next();
};

export const updateLastOnline: RequestHandler = (req, _res, next) => {
  if (req.session.user) {
    void userService.updateLastOnlineTime(req.session.user.id);
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.session.user) {
    next(new AppError('Sem sessão ativa', 401, ErrorCode.UNAUTHORIZED));
    return;
  }
  next();
};

export const cache = (options: CacheOptions = {}) => {
  const duration = options.duration ?? 300; // 5 minutes default

  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `${options.private ? 'private' : 'public'}, max-age=${duration.toString()}`);
    next();
  };
};

export const middleware: RequestHandler = (req, res) => {
  res.send('Hello World!');
};

import { UserService } from '#user/user.service.js';
import { RequestHandler } from 'express';
import { NextFunction, Request, Response } from 'express';

interface CacheOptions {
  duration?: number;
  private?: boolean;
}

const userService = new UserService();

export const updateLastOnline: RequestHandler = (req, _res, next) => {
  if (req.session.user) {
    void userService.updateLastOnlineTime(req.session.user.id);
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

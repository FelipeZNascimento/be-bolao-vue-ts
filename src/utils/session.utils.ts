import type { IUser } from '#user/user.types.js';
import type { Request } from 'express';

import { AppError } from '#utils/appError.js';
import { ErrorCode } from '#utils/errorCodes.js';

/**
 * Returns the authenticated user from the session, narrowed to `IUser`.
 *
 * Routes using this should be protected by the `requireAuth`/`requireAdmin`
 * middlewares, which already guarantee `req.session.user` is set. This
 * throws as a defensive fallback in case a route is ever misconfigured
 * without one of those middlewares.
 */
export function getAuthenticatedUser(req: Request): IUser {
  const user = req.session.user;
  if (!user) {
    throw new AppError('Sem sessão ativa', 401, ErrorCode.UNAUTHORIZED);
  }

  return user;
}

import { MailerService } from '#mailer/mailer.service.js';
import { AppError } from '#utils/appError.js';
import { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { IUser } from './user.types';
import { checkExistingEntries, validateEmail } from './user.utils';

// Mocks
const mockUserService = {
  getByEmail: vi.fn(),
  getById: vi.fn(),
  getBySeason: vi.fn(),
  getFavorites: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  setIcons: vi.fn(),
  setOnCurrentSeason: vi.fn(),
  updatePassword: vi.fn(),
  updatePasswordFromToken: vi.fn(),
  updateProfile: vi.fn()
};

const mockMailerService = {
  sendPasswordResetEmail: vi.fn()
};

const mockBcrypt = vi.hoisted(() => ({
  compare: vi.fn(),
  hash: vi.fn()
}));

vi.mock('bcrypt', () => ({ default: mockBcrypt }));

const mockCachedInfo = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  set: vi.fn()
}));

vi.mock('#user/user.service.js', () => ({ UserService: vi.fn(() => mockUserService) }));
vi.mock('#mailer/mailer.service.js', () => ({ MailerService: vi.fn(() => mockMailerService) }));

vi.mock('#utils/dataCache.js', () => ({
  cachedInfo: mockCachedInfo
}));

vi.mock('#user/user.utils.js', () => ({
  checkExistingEntries: vi.fn(),
  generateVerificationToken: vi.fn(() => 'token123'),
  validateEmail: vi.fn((email: string) => email === 'valid@email.com')
}));
vi.mock('#utils/apiResponse.js', () => ({
  ApiResponse: {
    error: vi.fn(),
    success: vi.fn()
  },
  isFulfilled: vi.fn((result: PromiseSettledResult<unknown>) => result.status === 'fulfilled'),
  isRejected: vi.fn((result: PromiseSettledResult<unknown>) => result.status === 'rejected')
}));

const mockUser: IUser = {
  color: 'e',
  email: 'a',
  fullName: 'Full Name',
  icon: 'd',
  id: 1,
  isOnline: false,
  name: 'b',
  seasonId: 1,
  timestamp: 123456789
};

function getMockReqResSession<P extends Record<string, string> = Record<string, string>>(user: IUser | null = null) {
  const session = {
    regenerate: vi.fn((cb?: () => void) => {
      if (cb) cb();
    }),
    save: vi.fn((cb?: () => void) => {
      if (cb) cb();
    }),
    user
  };
  return {
    next: vi.fn(),
    req: { body: {}, params: {} as P, session } as unknown as Request<P>,
    res: {} as unknown as Response
  };
}

describe('UserController', () => {
  let controller: UserController;

  beforeEach(() => {
    controller = new UserController(
      mockUserService as unknown as UserService,
      mockMailerService as unknown as MailerService
    );
    vi.clearAllMocks();
    process.env.SEASON = '2024';
  });

  afterEach(() => {
    delete process.env.SEASON;
  });

  it('forgotPassword: should throw if email is missing', async () => {
    const { next, req, res } = getMockReqResSession();
    req.body = {};

    await controller.forgotPassword(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('forgotPassword: should send reset email', async () => {
    const { next, req, res } = getMockReqResSession();
    req.body = { email: 'test@email.com' };

    await controller.forgotPassword(req, res, next);
    expect(mockMailerService.sendPasswordResetEmail).toHaveBeenCalledWith('test@email.com', '', 'token123');
  });

  it('getActiveProfile: should return null if no user in session', async () => {
    const { next, req, res } = getMockReqResSession();

    await controller.getActiveProfile(req, res, next);
    expect(mockUserService.getById).not.toHaveBeenCalled();
  });

  it('getActiveProfile: should return user profile', async () => {
    mockUserService.getById.mockResolvedValue(mockUser);
    mockUserService.getFavorites.mockResolvedValue([]);
    const { next, req, res } = getMockReqResSession(mockUser);

    await controller.getActiveProfile(req, res, next);
    expect(mockUserService.getById).toHaveBeenCalledWith(1);
  });

  it('getAll: should throw if season is missing', async () => {
    delete process.env.SEASON;
    const { next, req, res } = getMockReqResSession();

    await controller.getAll(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('getAll: should return users by season', async () => {
    mockUserService.getBySeason.mockResolvedValue([{ id: 1 }]);
    const { next, req, res } = getMockReqResSession();

    await controller.getAll(req, res, next);
    expect(mockUserService.getBySeason).toHaveBeenCalledWith(2024);
  });

  it('getById: should throw if season is missing', async () => {
    delete process.env.SEASON;
    const { next, req, res } = getMockReqResSession<{ userId: string }>();

    await controller.getById(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('getById: should return users by season if userId is missing', async () => {
    mockUserService.getBySeason.mockResolvedValue([{ id: 1 }]);
    const { next, req, res } = getMockReqResSession<{ userId: string }>();
    req.params = {} as unknown as { userId: string };

    await controller.getById(req, res, next);
    expect(mockUserService.getBySeason).toHaveBeenCalledWith(2024);
  });

  it('getById: should return user by id', async () => {
    mockUserService.getById.mockResolvedValue({ id: 2 });
    const { next, req, res } = getMockReqResSession<{ userId: string }>();
    req.params = { userId: '2' };

    await controller.getById(req, res, next);
    expect(mockUserService.getById).toHaveBeenCalledWith(2);
  });

  it('login: should throw if credentials are missing', async () => {
    const { next, req, res } = getMockReqResSession();
    req.body = {};

    await controller.login(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('login: should throw if login fails', async () => {
    mockUserService.login.mockRejectedValue(new AppError('Invalid credentials', 401));
    const { next, req, res } = getMockReqResSession();
    req.body = { email: 'a', password: 'b' };

    await controller.login(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('login: should throw if password is invalid', async () => {
    mockUserService.login.mockResolvedValue([{ ...mockUser, password: 'hashed' }]);
    mockBcrypt.compare.mockResolvedValue(false);
    const { next, req, res } = getMockReqResSession();
    req.body = { email: 'a', password: 'b' };

    await controller.login(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('login: should set session user', async () => {
    mockUserService.login.mockResolvedValue([{ ...mockUser, password: 'hashed' }]);
    mockBcrypt.compare.mockResolvedValue(true);
    mockUserService.getFavorites.mockResolvedValue([]);
    const { next, req, res } = getMockReqResSession();
    req.body = { email: 'a', password: 'b' };

    await controller.login(req, res, next);
    expect(req.session.user).toEqual(mockUser);
  });

  it('logout: should clear session user and regenerate session', async () => {
    const { next, req, res } = getMockReqResSession(mockUser);

    await controller.logout(req, res, next);
    expect(req.session.user).toBeNull();
    expect(req.session.save).toHaveBeenCalled();
    expect(req.session.regenerate).toHaveBeenCalled();
  });

  it('register: should throw if required fields are missing', async () => {
    const { next, req, res } = getMockReqResSession<{ season: string }>();
    req.body = {};

    await controller.register(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('register: should throw if checkExistingEntries returns false', async () => {
    const { next, req, res } = getMockReqResSession<{ season: string }>();
    req.body = { color: 'col', email: 'a', fullName: 'd', icon: 'i', name: 'c', password: 'b' };
    (checkExistingEntries as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await controller.register(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('register: should throw if registerResponse.affectedRows is 0', async () => {
    const { next, req, res } = getMockReqResSession<{ season: string }>();
    req.body = { color: 'col', email: 'a', fullName: 'd', icon: 'i', name: 'c', password: 'b' };
    (checkExistingEntries as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    mockUserService.register.mockResolvedValue({ affectedRows: 0 });

    await controller.register(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('updatePassword: should throw if no session user', async () => {
    const { next, req, res } = getMockReqResSession();
    req.body = {};

    await controller.updatePassword(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('updatePassword: should throw if required fields missing', async () => {
    const { next, req, res } = getMockReqResSession(mockUser);
    req.body = {};

    await controller.updatePassword(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('updatePassword: should throw if affectedRows is 0', async () => {
    const { next, req, res } = getMockReqResSession(mockUser);
    req.body = { currentPassword: 'a', newPassword: 'b' };
    mockUserService.updatePassword.mockResolvedValue({ affectedRows: 0 });

    await controller.updatePassword(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('updatePasswordFromToken: should throw if required fields missing', async () => {
    const { next, req, res } = getMockReqResSession();
    req.body = {};

    await controller.updatePasswordFromToken(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('updatePasswordFromToken: should throw if token does not match', async () => {
    const { next, req, res } = getMockReqResSession();
    mockCachedInfo.get.mockReturnValue('expected');
    req.body = { email: 'a', newPassword: 'b', token: 'wrong' };

    await controller.updatePasswordFromToken(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('updatePreferences: should throw if no session user', async () => {
    const { next, req, res } = getMockReqResSession();

    await controller.updatePreferences(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('updateProfile: should throw if no session user', async () => {
    const { next, req, res } = getMockReqResSession();

    await controller.updateProfile(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('updateProfile: should throw if required fields missing', async () => {
    const { next, req, res } = getMockReqResSession(mockUser);
    req.body = {};

    await controller.updateProfile(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('updateProfile: should throw if email is invalid', async () => {
    const { next, req, res } = getMockReqResSession(mockUser);
    req.body = { email: 'invalid', name: 'n', username: 'u' };
    (validateEmail as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    await controller.updateProfile(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('updateProfile: should throw if checkExistingEntries returns false', async () => {
    const { next, req, res } = getMockReqResSession(mockUser);
    req.body = { email: 'valid@email.com', name: 'n', username: 'u' };
    (validateEmail as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (checkExistingEntries as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await controller.updateProfile(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });
});

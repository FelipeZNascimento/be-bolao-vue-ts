import { BetService } from '#bet/bet.service.js';
import { MatchService } from '#match/match.service.js';
import { TeamService } from '#team/team.service.js';
import { IUser } from '#user/user.types.js';
import { AppError } from '#utils/appError.js';
import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BetController } from './bet.controller';

const mockBetService = {
  getActiveProfileExtras: vi.fn(),
  getExtras: vi.fn(),
  getExtrasResults: vi.fn(),
  update: vi.fn(),
  updateExtras: vi.fn()
};

const mockMatchService = {
  getTimestampByMatchId: vi.fn()
};

const mockTeamService = {
  getAll: vi.fn()
};

const mockCachedInfo = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(() => []),
  set: vi.fn()
}));

vi.mock('#utils/dataCache.js', () => ({
  CACHE_KEYS: { CURRENT_WEEK: 1, MATCH_DETAILS: 3, TEAMS: 0, WEEKLY_RANKING: 2 },
  cachedInfo: mockCachedInfo
}));
vi.mock('#utils/apiResponse.js', () => ({
  ApiResponse: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

const mockUser: IUser = {
  active: true,
  admin: false,
  balance: 0,
  color: 'e',
  email: 'a',
  fullName: 'Full Name',
  icon: 'd',
  id: 1,
  isOnline: false,
  name: 'b',
  seasonId: 14,
  timestamp: 123456789
};

function getMockReqResSession(user: IUser | null = null) {
  const session = { user };
  return {
    next: vi.fn(),
    req: { body: {}, params: {}, session } as unknown as Request,
    res: {} as unknown as Response
  };
}

describe('BetController', () => {
  let controller: BetController;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCachedInfo.get.mockReturnValue([]);
    controller = new BetController(
      mockBetService as unknown as BetService,
      mockMatchService as unknown as MatchService,
      mockTeamService as unknown as TeamService
    );
    process.env.SEASON = '14';
    process.env.SEASON_START = '1000';
  });

  describe('getExtras', () => {
    it('throws if SEASON_START is missing', async () => {
      delete process.env.SEASON_START;
      const { next, req, res } = getMockReqResSession();

      await controller.getExtras(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns extras without active profile extras when no session user', async () => {
      mockBetService.getExtras.mockResolvedValue([]);
      const { next, req, res } = getMockReqResSession();

      await controller.getExtras(req, res, next);
      expect(mockBetService.getActiveProfileExtras).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('includes active profile extras when session user exists', async () => {
      mockBetService.getExtras.mockResolvedValue([]);
      mockBetService.getActiveProfileExtras.mockResolvedValue([]);
      const { next, req, res } = getMockReqResSession(mockUser);

      await controller.getExtras(req, res, next);
      expect(mockBetService.getActiveProfileExtras).toHaveBeenCalledWith(mockUser.id, 14);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getExtrasResults', () => {
    it('returns empty bets when no results found', async () => {
      mockBetService.getExtrasResults.mockResolvedValue(undefined);
      const { next, req, res } = getMockReqResSession();

      await controller.getExtrasResults(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws 401 when no session user', async () => {
      const { next, req, res } = getMockReqResSession();
      req.body = { betValue: 1, matchId: 2 };

      await controller.update(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('throws when user is not active', async () => {
      const { next, req, res } = getMockReqResSession({ ...mockUser, active: false });
      req.body = { betValue: 1, matchId: 2 };

      await controller.update(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockBetService.update).not.toHaveBeenCalled();
    });

    it('throws when match already started', async () => {
      mockMatchService.getTimestampByMatchId.mockResolvedValue({ timestamp: 0 });
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = { betValue: 1, matchId: 2 };

      await controller.update(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockBetService.update).not.toHaveBeenCalled();
    });

    it('updates bet when match has not started', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 10000;
      mockMatchService.getTimestampByMatchId.mockResolvedValue({ timestamp: futureTimestamp });
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = { betValue: 1, matchId: 2 };

      await controller.update(req, res, next);
      expect(mockBetService.update).toHaveBeenCalledWith(1, 2, mockUser.id);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('updateExtra', () => {
    it('throws 401 when no session user', async () => {
      const { next, req, res } = getMockReqResSession();
      req.body = {};

      await controller.updateExtra(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('throws when user is not active', async () => {
      const { next, req, res } = getMockReqResSession({ ...mockUser, active: false });
      req.body = {};

      await controller.updateExtra(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockBetService.updateExtras).not.toHaveBeenCalled();
    });

    it('throws when season has already started', async () => {
      process.env.SEASON_START = '0';
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = {};

      await controller.updateExtra(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockBetService.updateExtras).not.toHaveBeenCalled();
    });

    it('updates extras when season has not started', async () => {
      process.env.SEASON_START = String(Math.floor(Date.now() / 1000) + 10000);
      mockBetService.getActiveProfileExtras.mockResolvedValue([]);
      mockBetService.getExtras.mockResolvedValue([]);
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = {};

      await controller.updateExtra(req, res, next);
      expect(mockBetService.updateExtras).toHaveBeenCalledWith(JSON.stringify({}), mockUser.id, '14');
      expect(next).not.toHaveBeenCalled();
    });
  });
});

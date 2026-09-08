import { BetService } from '#bet/bet.service.js';
import { MatchService } from '#match/match.service.js';
import { TeamService } from '#team/team.service.js';
import { UserService } from '#user/user.service.js';
import { AppError } from '#utils/appError.js';
import { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RankingController } from './ranking.controller';

const mockUserService = {
  getBySeason: vi.fn()
};

const mockMatchService = {
  getMatchesBySeason: vi.fn()
};

const mockTeamService = {
  getAll: vi.fn()
};

const mockBetService = {
  getExtras: vi.fn(),
  getExtrasResults: vi.fn(),
  getStartedMatchesBetsByMatchIds: vi.fn()
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
  },
  isFulfilled: vi.fn((result: PromiseSettledResult<unknown>) => result.status === 'fulfilled'),
  isRejected: vi.fn((result: PromiseSettledResult<unknown>) => result.status === 'rejected')
}));

function getMockReqRes(params: Record<string, string> = {}) {
  return {
    next: vi.fn(),
    req: { body: {}, params } as unknown as Request,
    res: {} as unknown as Response
  };
}

describe('RankingController', () => {
  let controller: RankingController;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCachedInfo.get.mockReturnValue([]);
    controller = new RankingController(
      mockUserService as unknown as UserService,
      mockMatchService as unknown as MatchService,
      mockTeamService as unknown as TeamService,
      mockBetService as unknown as BetService
    );
    process.env.SEASON = '14';
    process.env.SEASON_START = '1000';
  });

  afterEach(() => {
    delete process.env.SEASON;
    delete process.env.SEASON_START;
  });

  describe('getRanking', () => {
    it('throws when SEASON is missing and no param season', async () => {
      delete process.env.SEASON;
      const { next, req, res } = getMockReqRes();

      await controller.getRanking(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('throws when SEASON_START is missing', async () => {
      delete process.env.SEASON_START;
      const { next, req, res } = getMockReqRes();

      await controller.getRanking(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('calls calculateRanking with parsed season/seasonStart and does not error', async () => {
      const spy = vi.spyOn(controller, 'calculateRanking').mockResolvedValue({ seasonRanking: [], weeklyRanking: [] });
      const { next, req, res } = getMockReqRes();

      await controller.getRanking(req, res, next);
      expect(spy).toHaveBeenCalledWith(14, 1000);
      expect(next).not.toHaveBeenCalled();
    });

    it('uses season from params when provided', async () => {
      const spy = vi.spyOn(controller, 'calculateRanking').mockResolvedValue({ seasonRanking: [], weeklyRanking: [] });
      const { next, req, res } = getMockReqRes({ season: '5' });

      await controller.getRanking(req, res, next);
      expect(spy).toHaveBeenCalledWith(5, 1000);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('fetchRequiredData', () => {
    it('throws when user and matches fetches both fail', async () => {
      mockUserService.getBySeason.mockRejectedValue(new Error('db down'));
      mockMatchService.getMatchesBySeason.mockRejectedValue(new Error('db down'));
      mockBetService.getExtras.mockResolvedValue([]);
      mockBetService.getExtrasResults.mockResolvedValue(null);

      await expect(controller.fetchRequiredData(14, 1000)).rejects.toThrow(AppError);
    });

    it('fetches teams from service when cache is empty', async () => {
      mockCachedInfo.get.mockReturnValueOnce(undefined as unknown as never[]);
      mockTeamService.getAll.mockResolvedValue([]);
      mockUserService.getBySeason.mockResolvedValue([]);
      mockMatchService.getMatchesBySeason.mockResolvedValue([]);
      mockBetService.getExtras.mockResolvedValue([]);
      mockBetService.getExtrasResults.mockResolvedValue(null);

      const result = await controller.fetchRequiredData(14, 1000);
      expect(mockTeamService.getAll).toHaveBeenCalled();
      expect(result.users).toEqual([]);
    });
  });
});

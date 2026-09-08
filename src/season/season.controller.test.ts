import { MatchService } from '#match/match.service.js';
import { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SeasonController } from './season.controller';

const mockMatchService = {
  getCurrentWeek: vi.fn()
};

const mockCachedInfo = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
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

function getMockReqRes() {
  return {
    next: vi.fn(),
    req: { body: {}, params: {} } as unknown as Request,
    res: {} as unknown as Response
  };
}

describe('SeasonController', () => {
  let controller: SeasonController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new SeasonController(mockMatchService as unknown as MatchService);
    process.env.SEASON = '14';
    process.env.SEASON_START = '1000';
  });

  afterEach(() => {
    delete process.env.SEASON;
    delete process.env.SEASON_START;
  });

  it('returns cached current week without fetching', async () => {
    mockCachedInfo.get.mockReturnValue(5);
    const { next, req, res } = getMockReqRes();

    await controller.getCurrentSeasonInfo(req, res, next);
    expect(mockMatchService.getCurrentWeek).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('fetches and caches current week when not cached', async () => {
    mockCachedInfo.get.mockReturnValue(undefined);
    mockMatchService.getCurrentWeek.mockResolvedValue(7);
    const { next, req, res } = getMockReqRes();

    await controller.getCurrentSeasonInfo(req, res, next);
    expect(mockMatchService.getCurrentWeek).toHaveBeenCalled();
    expect(mockCachedInfo.set).toHaveBeenCalledWith(1, 7, 60 * 60 * 4);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns nulls when SEASON and SEASON_START are missing', async () => {
    delete process.env.SEASON;
    delete process.env.SEASON_START;
    mockCachedInfo.get.mockReturnValue(undefined);
    mockMatchService.getCurrentWeek.mockResolvedValue(undefined);
    const { next, req, res } = getMockReqRes();

    await controller.getCurrentSeasonInfo(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });
});

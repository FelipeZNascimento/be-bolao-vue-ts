import type { IMatchSummary } from '#match/match.types.js';

import { BetService } from '#bet/bet.service.js';
import { MatchController } from '#match/match.controller.js';
import { MatchService } from '#match/match.service.js';
import { TeamService } from '#team/team.service.js';
import { UserService } from '#user/user.service.js';
import { WebSocketService } from '#websocket/websocket.service.js';
import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMatchService = {
  getMoreDetails: vi.fn()
};

const mockCachedInfo = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  set: vi.fn()
}));

vi.mock('#match/match.service.js', () => ({ MatchService: vi.fn(() => mockMatchService) }));
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

const mockMatchDetails = { article: [] } as unknown as IMatchSummary;

function getMockReqRes(espnId = '401873275', status = 0) {
  return {
    next: vi.fn(),
    req: { body: { status }, params: { espnId } } as unknown as Request<{ espnId: string }>,
    res: {} as unknown as Response
  };
}

describe('MatchController.getMoreDetails', () => {
  let controller: MatchController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MatchController(
      mockMatchService as unknown as MatchService,
      {} as UserService,
      {} as BetService,
      {} as TeamService,
      {} as WebSocketService
    );
  });

  it('fetches and caches when nothing is cached', async () => {
    mockCachedInfo.get.mockReturnValue(undefined);
    mockMatchService.getMoreDetails.mockResolvedValue(mockMatchDetails);
    const { next, req, res } = getMockReqRes(undefined, 0);

    await controller.getMoreDetails(req, res, next);

    expect(mockMatchService.getMoreDetails).toHaveBeenCalledWith(401873275);
    expect(mockCachedInfo.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ isFinished: false, matchDetails: mockMatchDetails })
    );
  });

  it('returns cache when match and cache are both finished', async () => {
    mockCachedInfo.get.mockReturnValue({
      isFinished: true,
      matchDetails: mockMatchDetails,
      timestamp: Date.now()
    });
    const { next, req, res } = getMockReqRes(undefined, 1);

    await controller.getMoreDetails(req, res, next);

    expect(mockMatchService.getMoreDetails).not.toHaveBeenCalled();
  });

  it('refetches when match is finished but cache says not finished', async () => {
    mockCachedInfo.get.mockReturnValue({
      isFinished: false,
      matchDetails: mockMatchDetails,
      timestamp: Date.now()
    });
    mockMatchService.getMoreDetails.mockResolvedValue(mockMatchDetails);
    const { next, req, res } = getMockReqRes(undefined, 1);

    await controller.getMoreDetails(req, res, next);

    expect(mockMatchService.getMoreDetails).toHaveBeenCalled();
  });

  it('returns cache when not finished and cache is fresh (<1 minute)', async () => {
    mockCachedInfo.get.mockReturnValue({
      isFinished: false,
      matchDetails: mockMatchDetails,
      timestamp: Date.now() - 1000
    });
    const { next, req, res } = getMockReqRes(undefined, 0);

    await controller.getMoreDetails(req, res, next);

    expect(mockMatchService.getMoreDetails).not.toHaveBeenCalled();
  });

  it('refetches when not finished and cache is stale (>1 minute)', async () => {
    mockCachedInfo.get.mockReturnValue({
      isFinished: false,
      matchDetails: mockMatchDetails,
      timestamp: Date.now() - 61 * 1000
    });
    mockMatchService.getMoreDetails.mockResolvedValue(mockMatchDetails);
    const { next, req, res } = getMockReqRes(undefined, 0);

    await controller.getMoreDetails(req, res, next);

    expect(mockMatchService.getMoreDetails).toHaveBeenCalled();
  });
});

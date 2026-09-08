import type { IMatch, IMatchSummary } from '#match/match.types.js';
import type { IUser } from '#user/user.types.js';

import { BetService } from '#bet/bet.service.js';
import { MatchController } from '#match/match.controller.js';
import { MatchService } from '#match/match.service.js';
import { TeamService } from '#team/team.service.js';
import { UserService } from '#user/user.service.js';
import { AppError } from '#utils/appError.js';
import { WebSocketService } from '#websocket/websocket.service.js';
import { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockMatchService = {
  getBySeasonWeek: vi.fn(),
  getCurrentWeek: vi.fn(),
  getIdByMatchInfo: vi.fn(),
  getMoreDetails: vi.fn(),
  updateByMatchInfo: vi.fn(),
  updateOddsByMatchInfo: vi.fn()
};

const mockBetService = {
  getStartedMatchesBetsByMatchIds: vi.fn(),
  getUserMatchesBetsByMatchIds: vi.fn()
};

const mockTeamUtil = vi.hoisted(() => ({
  getFromCacheOrFetch: vi.fn(),
  setTeamsCache: vi.fn()
}));

const mockRankingController = vi.hoisted(() => ({
  calculateRanking: vi.fn()
}));

const mockWebsocketInstance = {
  broadcast: vi.fn()
};

const mockCachedInfo = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  set: vi.fn()
}));

vi.mock('#match/match.service.js', () => ({ MatchService: vi.fn(() => mockMatchService) }));
vi.mock('#team/team.util.js', () => mockTeamUtil);
vi.mock('#ranking/ranking.controller.js', () => ({
  RankingController: vi.fn().mockImplementation(function () {
    return mockRankingController;
  })
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

const mockMatchDetails = { article: [] } as unknown as IMatchSummary;

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

function getMockReqRes(espnId = '401873275', status = 0) {
  return {
    next: vi.fn(),
    req: { body: { status }, params: { espnId } } as unknown as Request<{ espnId: string }>,
    res: {} as unknown as Response
  };
}

function getFullController() {
  return new MatchController(
    mockMatchService as unknown as MatchService,
    {} as UserService,
    mockBetService as unknown as BetService,
    {} as TeamService,
    mockWebsocketInstance as unknown as WebSocketService
  );
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

function getSeasonWeekReqRes(params: Record<string, string> = {}, user: IUser | null = null) {
  return {
    next: vi.fn(),
    req: { body: {}, params, session: { user } } as unknown as Request,
    res: {} as unknown as Response
  };
}

describe('MatchController.getBySeasonWeek', () => {
  let controller: MatchController;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamUtil.getFromCacheOrFetch.mockResolvedValue([]);
    controller = getFullController();
    process.env.SEASON = '14';
  });

  afterEach(() => {
    delete process.env.SEASON;
  });

  it('throws when season and week are both unavailable', async () => {
    delete process.env.SEASON;
    mockMatchService.getCurrentWeek.mockResolvedValue(undefined);
    const { next, req, res } = getSeasonWeekReqRes();

    await controller.getBySeasonWeek(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('fetches current week when week param is missing', async () => {
    mockMatchService.getCurrentWeek.mockResolvedValue(3);
    mockMatchService.getBySeasonWeek.mockResolvedValue([]);
    mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue([]);
    const { next, req, res } = getSeasonWeekReqRes();

    await controller.getBySeasonWeek(req, res, next);
    expect(mockMatchService.getCurrentWeek).toHaveBeenCalled();
    expect(mockMatchService.getBySeasonWeek).toHaveBeenCalledWith(14, 3);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not fetch user bets when no session user', async () => {
    mockMatchService.getBySeasonWeek.mockResolvedValue([]);
    mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue([]);
    const { next, req, res } = getSeasonWeekReqRes({ week: '5' });

    await controller.getBySeasonWeek(req, res, next);
    expect(mockBetService.getUserMatchesBetsByMatchIds).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('fetches user bets when session user is present', async () => {
    mockMatchService.getBySeasonWeek.mockResolvedValue([]);
    mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue([]);
    mockBetService.getUserMatchesBetsByMatchIds.mockResolvedValue([]);
    const { next, req, res } = getSeasonWeekReqRes({ week: '5' }, mockUser);

    await controller.getBySeasonWeek(req, res, next);
    expect(mockBetService.getUserMatchesBetsByMatchIds).toHaveBeenCalledWith([], mockUser.id);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws AppError when started matches bets fetch is rejected', async () => {
    mockMatchService.getBySeasonWeek.mockResolvedValue([]);
    mockBetService.getStartedMatchesBetsByMatchIds.mockRejectedValue(new Error('db error'));
    const { next, req, res } = getSeasonWeekReqRes({ week: '5' });

    await controller.getBySeasonWeek(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('wraps mergeBetsToMatches errors (missing team) into AppError', async () => {
    const match = { id: 1, idTeamAway: 99, idTeamHome: 98, week: 5 } as unknown as IMatch;
    mockMatchService.getBySeasonWeek.mockResolvedValue([match]);
    mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue([]);
    const { next, req, res } = getSeasonWeekReqRes({ week: '5' });

    await controller.getBySeasonWeek(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });
});

describe('MatchController.updateFromKey', () => {
  let controller: MatchController;

  const baseBody = {
    awayPoints: 10,
    awayTeamCode: 'AWY',
    clock: null,
    homePoints: 7,
    homeTeamCode: 'HOM',
    homeTeamOdds: '-110',
    overUnder: '45.5',
    possession: null,
    status: 2,
    week: 5
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamUtil.getFromCacheOrFetch.mockResolvedValue([]);
    controller = getFullController();
    process.env.SEASON = '14';
    process.env.SEASON_START = '1000';
    process.env.API_UPDATE_KEY = 'secret-key';
  });

  afterEach(() => {
    delete process.env.SEASON;
    delete process.env.SEASON_START;
    delete process.env.API_UPDATE_KEY;
  });

  function getUpdateReqRes(key = 'secret-key', body: Record<string, unknown> = baseBody, user: IUser | null = null) {
    return {
      next: vi.fn(),
      req: { body, params: { key }, session: { user } } as unknown as Request,
      res: {} as unknown as Response
    };
  }

  it('throws when SEASON/SEASON_START env vars are missing', async () => {
    delete process.env.SEASON;
    const { next, req, res } = getUpdateReqRes();

    await controller.updateFromKey(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('throws when key does not match API_UPDATE_KEY', async () => {
    const { next, req, res } = getUpdateReqRes('wrong-key');

    await controller.updateFromKey(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('throws when status is NOT_STARTED and odds fields are missing', async () => {
    mockMatchService.getIdByMatchInfo.mockResolvedValue({ espnId: 1, id: 1 });
    const { next, req, res } = getUpdateReqRes('secret-key', {
      ...baseBody,
      homeTeamOdds: null,
      overUnder: null,
      status: 0
    });

    await controller.updateFromKey(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(mockMatchService.updateOddsByMatchInfo).not.toHaveBeenCalled();
  });

  it('throws when status is not NOT_STARTED and score fields are missing', async () => {
    mockMatchService.getIdByMatchInfo.mockResolvedValue({ espnId: 1, id: 1 });
    const { next, req, res } = getUpdateReqRes('secret-key', {
      ...baseBody,
      awayPoints: null,
      homePoints: null
    });

    await controller.updateFromKey(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(mockMatchService.updateByMatchInfo).not.toHaveBeenCalled();
  });

  it('updates odds only when status is NOT_STARTED, then recalculates ranking', async () => {
    mockMatchService.getIdByMatchInfo.mockResolvedValue({ espnId: 1, id: 1 });
    mockMatchService.updateOddsByMatchInfo.mockResolvedValue({ affectedRows: 1 });
    mockMatchService.getMoreDetails.mockResolvedValue(mockMatchDetails);
    mockRankingController.calculateRanking.mockResolvedValue({ seasonRanking: [], weeklyRanking: [] });
    mockCachedInfo.get.mockReturnValue(5);
    mockMatchService.getBySeasonWeek.mockResolvedValue([]);
    mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue([]);
    const { next, req, res } = getUpdateReqRes('secret-key', { ...baseBody, status: 0 });

    await controller.updateFromKey(req, res, next);
    expect(mockMatchService.updateOddsByMatchInfo).toHaveBeenCalledWith('45.5', '-110', 'AWY', 'HOM', 5, 0, 14);
    expect(mockRankingController.calculateRanking).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('does not recalculate ranking or broadcast when no rows were affected', async () => {
    mockMatchService.getIdByMatchInfo.mockResolvedValue({ espnId: 1, id: 1 });
    mockMatchService.updateByMatchInfo.mockResolvedValue({ affectedRows: 0 });
    const { next, req, res } = getUpdateReqRes();

    await controller.updateFromKey(req, res, next);
    expect(mockRankingController.calculateRanking).not.toHaveBeenCalled();
    expect(mockWebsocketInstance.broadcast).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('refreshes match details cache, recalculates ranking, and broadcasts when rows are affected', async () => {
    mockMatchService.getIdByMatchInfo.mockResolvedValue({ espnId: 401, id: 1 });
    mockMatchService.updateByMatchInfo.mockResolvedValue({ affectedRows: 1 });
    mockMatchService.getMoreDetails.mockResolvedValue(mockMatchDetails);
    mockRankingController.calculateRanking.mockResolvedValue({ seasonRanking: [], weeklyRanking: [] });
    mockCachedInfo.get.mockReturnValue(5);
    mockMatchService.getBySeasonWeek.mockResolvedValue([]);
    mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue([]);
    const { next, req, res } = getUpdateReqRes();

    await controller.updateFromKey(req, res, next);

    expect(mockMatchService.getMoreDetails).toHaveBeenCalledWith(401);
    expect(mockRankingController.calculateRanking).toHaveBeenCalledWith(14, 1000);
    expect(mockWebsocketInstance.broadcast).toHaveBeenCalledWith(expect.any(String));
    expect(next).not.toHaveBeenCalled();
  });

  it('fetches current week from service when not cached before broadcasting', async () => {
    mockMatchService.getIdByMatchInfo.mockResolvedValue({ espnId: 401, id: 1 });
    mockMatchService.updateByMatchInfo.mockResolvedValue({ affectedRows: 1 });
    mockMatchService.getMoreDetails.mockResolvedValue(mockMatchDetails);
    mockRankingController.calculateRanking.mockResolvedValue({ seasonRanking: [], weeklyRanking: [] });
    mockCachedInfo.get.mockReturnValue(undefined);
    mockMatchService.getCurrentWeek.mockResolvedValue(6);
    mockMatchService.getBySeasonWeek.mockResolvedValue([]);
    mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue([]);
    const { next, req, res } = getUpdateReqRes();

    await controller.updateFromKey(req, res, next);

    expect(mockMatchService.getCurrentWeek).toHaveBeenCalled();
    expect(mockMatchService.getBySeasonWeek).toHaveBeenCalledWith(14, 6);
    expect(next).not.toHaveBeenCalled();
  });
});

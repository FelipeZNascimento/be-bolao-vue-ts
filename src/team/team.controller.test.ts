import type { ITeam } from '#team/team.types.js';

import { TeamService } from '#team/team.service.js';
import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TeamController } from './team.controller';

const mockTeamService = {
  getAll: vi.fn()
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

const mockTeams: ITeam[] = [
  { code: 'AFC-E-1', conference: 'AFC', division: 'East', id: 1, name: 'A', winLosses: '0-0' } as ITeam,
  { code: 'AFC-N-1', conference: 'AFC', division: 'North', id: 2, name: 'B', winLosses: '0-0' } as ITeam,
  { code: 'NFC-E-1', conference: 'NFC', division: 'East', id: 3, name: 'C', winLosses: '0-0' } as ITeam
];

function getMockReqRes() {
  return {
    next: vi.fn(),
    req: { body: {}, params: {} } as unknown as Request,
    res: {} as unknown as Response
  };
}

describe('TeamController', () => {
  let controller: TeamController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new TeamController(mockTeamService as unknown as TeamService);
  });

  describe('getAll', () => {
    it('returns cached teams without fetching when cache is populated', async () => {
      mockCachedInfo.get.mockReturnValue(mockTeams);
      const { next, req, res } = getMockReqRes();

      await controller.getAll(req, res, next);
      expect(mockTeamService.getAll).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('fetches and caches teams when cache is empty', async () => {
      mockCachedInfo.get.mockReturnValue(undefined);
      mockTeamService.getAll.mockResolvedValue(mockTeams);
      const { next, req, res } = getMockReqRes();

      await controller.getAll(req, res, next);
      expect(mockTeamService.getAll).toHaveBeenCalled();
      expect(mockCachedInfo.set).toHaveBeenCalledWith(0, mockTeams);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getByConferenceAndDivision', () => {
    it('groups teams by conference and division', async () => {
      mockCachedInfo.get.mockReturnValue(mockTeams);
      const { next, req, res } = getMockReqRes();

      await controller.getByConferenceAndDivision(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('fetches teams when cache is empty', async () => {
      mockCachedInfo.get.mockReturnValue(undefined);
      mockTeamService.getAll.mockResolvedValue(mockTeams);
      const { next, req, res } = getMockReqRes();

      await controller.getByConferenceAndDivision(req, res, next);
      expect(mockTeamService.getAll).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});

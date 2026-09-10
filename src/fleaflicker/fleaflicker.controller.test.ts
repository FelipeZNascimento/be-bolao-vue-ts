import { FleaflickerService } from '#fleaflicker/fleaflicker.service.js';
import { IUser } from '#user/user.types.js';
import { AppError } from '#utils/appError.js';
import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FleaflickerController } from './fleaflicker.controller';

const mockFleaflickerService = {
  deleteFleaflickerInfo: vi.fn(),
  getLeagueBoxscore: vi.fn(),
  getLeagueScoreboard: vi.fn(),
  getRoster: vi.fn(),
  getStandings: vi.fn(),
  setFleaflickerInfo: vi.fn()
};

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
  const session: { user: IUser | null } = { user };
  return {
    next: vi.fn(),
    req: { body: {}, params: {}, query: {}, session } as unknown as Request,
    res: {} as unknown as Response
  };
}

describe('FleaflickerController', () => {
  let controller: FleaflickerController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new FleaflickerController(mockFleaflickerService as unknown as FleaflickerService);
  });

  it('getRoster: fetches roster with leagueId and teamId', async () => {
    mockFleaflickerService.getRoster.mockResolvedValue({});
    const { next, req, res } = getMockReqResSession();
    req.params = { leagueId: '1', teamId: '2' };

    await controller.getRoster(req, res, next);
    expect(mockFleaflickerService.getRoster).toHaveBeenCalledWith('1', '2');
    expect(next).not.toHaveBeenCalled();
  });

  it('getBoxscore: fetches scoreboard with leagueId and scoringPeriod when gameId is absent', async () => {
    mockFleaflickerService.getLeagueScoreboard.mockResolvedValue({});
    const { next, req, res } = getMockReqResSession();
    req.params = { leagueId: '1' };
    req.query = { scoringPeriod: '3' };

    await controller.getBoxscore(req, res, next);
    expect(mockFleaflickerService.getLeagueScoreboard).toHaveBeenCalledWith('1', '3');
    expect(mockFleaflickerService.getLeagueBoxscore).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('getBoxscore: fetches boxscore with leagueId and gameId when gameId is present', async () => {
    mockFleaflickerService.getLeagueBoxscore.mockResolvedValue({});
    const { next, req, res } = getMockReqResSession();
    req.params = { leagueId: '1' };
    req.query = { gameId: '99', scoringPeriod: '3' };

    await controller.getBoxscore(req, res, next);
    expect(mockFleaflickerService.getLeagueBoxscore).toHaveBeenCalledWith('1', '99');
    expect(mockFleaflickerService.getLeagueScoreboard).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('getStandings: fetches standings with leagueId', async () => {
    mockFleaflickerService.getStandings.mockResolvedValue({});
    const { next, req, res } = getMockReqResSession();
    req.params = { leagueId: '1' };

    await controller.getStandings(req, res, next);
    expect(mockFleaflickerService.getStandings).toHaveBeenCalledWith('1');
    expect(next).not.toHaveBeenCalled();
  });

  describe('setFleaflickerInfo', () => {
    it('throws 401 when no session user', async () => {
      const { next, req, res } = getMockReqResSession();
      req.body = { leagueId: 1, teamId: 2 };

      await controller.setFleaflickerInfo(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('sets info and updates session when affected rows > 0', async () => {
      mockFleaflickerService.setFleaflickerInfo.mockResolvedValue({ affectedRows: 1 });
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = { leagueId: 1, teamId: 2 };

      await controller.setFleaflickerInfo(req, res, next);
      expect(mockFleaflickerService.setFleaflickerInfo).toHaveBeenCalledWith(mockUser.id, 1, 2);
      expect(req.session.user).toEqual({ ...mockUser, fleaflicker: { leagueId: 1, teamId: 2 } });
      expect(next).not.toHaveBeenCalled();
    });

    it('does not update session when affected rows is 0', async () => {
      mockFleaflickerService.setFleaflickerInfo.mockResolvedValue({ affectedRows: 0 });
      const { next, req, res } = getMockReqResSession(mockUser);
      req.body = { leagueId: 1, teamId: 2 };

      await controller.setFleaflickerInfo(req, res, next);
      expect(req.session.user).toEqual(mockUser);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('deleteFleaflickerInfo', () => {
    it('throws 401 when no session user', async () => {
      const { next, req, res } = getMockReqResSession();

      await controller.deleteFleaflickerInfo(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('deletes info and clears session fleaflicker when affected rows > 0', async () => {
      mockFleaflickerService.deleteFleaflickerInfo.mockResolvedValue({ affectedRows: 1 });
      const { next, req, res } = getMockReqResSession(mockUser);

      await controller.deleteFleaflickerInfo(req, res, next);
      expect(mockFleaflickerService.deleteFleaflickerInfo).toHaveBeenCalledWith(mockUser.id);
      expect(req.session.user).toEqual({ ...mockUser, fleaflicker: null });
      expect(next).not.toHaveBeenCalled();
    });

    it('does not update session when affected rows is 0', async () => {
      mockFleaflickerService.deleteFleaflickerInfo.mockResolvedValue({ affectedRows: 0 });
      const { next, req, res } = getMockReqResSession(mockUser);

      await controller.deleteFleaflickerInfo(req, res, next);
      expect(req.session.user).toEqual(mockUser);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

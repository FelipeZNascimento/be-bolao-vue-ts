import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({
  query: vi.fn()
}));

vi.mock('#database/db.js', () => ({ default: mockDb }));

import { UserService } from './user.service';

const mockBetService = {
  getStartedMatchesBetsByMatchIds: vi.fn(),
  getUserMatchesBetsByMatchIds: vi.fn()
};

const mockMatchService = {
  getBySeason: vi.fn()
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(
      mockBetService as unknown as import('#bet/bet.service.js').BetService,
      mockMatchService as unknown as import('#match/match.service.js').MatchService
    );
    vi.clearAllMocks();
  });

  describe('getExtraBetsCounts', () => {
    it('counts scalar values, array lengths, and skips nulls', async () => {
      mockDb.query.mockResolvedValue([
        {
          id_user: 1,
          json: JSON.stringify({
            1: 3,
            2: 3,
            3: 25,
            4: null,
            5: 4,
            6: null,
            7: null,
            8: null,
            9: null,
            10: null,
            11: null,
            12: [7, 8, 13],
            13: []
          })
        }
      ]);

      const counts = await service.getExtraBetsCounts(1);

      expect(counts.get(1)).toBe(7);
    });

    it('sums counts across multiple rows for the same user', async () => {
      mockDb.query.mockResolvedValue([
        { id_user: 1, json: JSON.stringify({ 1: 2, 2: null }) },
        { id_user: 1, json: JSON.stringify({ 1: [1, 2, 3] }) }
      ]);

      const counts = await service.getExtraBetsCounts(1);

      expect(counts.get(1)).toBe(4);
    });

    it('returns an empty map when there are no rows', async () => {
      mockDb.query.mockResolvedValue([]);

      const counts = await service.getExtraBetsCounts(1);

      expect(counts.size).toBe(0);
    });
  });

  describe('getUserSeasons', () => {
    it('returns the distinct seasons a user participated in', async () => {
      mockDb.query.mockResolvedValue([{ season: 10 }, { season: 11 }]);

      const seasons = await service.getUserSeasons(1);

      expect(seasons).toEqual([10, 11]);
    });
  });

  describe('getSeasonsRanking', () => {
    it('groups rows by season and by user, sorted by percentage desc', async () => {
      mockDb.query.mockResolvedValue([
        { color: 'red', icon: 'a', name: 'User One', percentage: '50.0', season: 10, userId: 1 },
        { color: 'blue', icon: 'b', name: 'User Two', percentage: '90.5', season: 10, userId: 2 },
        { color: 'red', icon: 'a', name: 'User One', percentage: '70.2', season: 11, userId: 1 }
      ]);

      const result = await service.getSeasonsRanking();

      expect(result.all.map((row) => row.user.id)).toEqual([2, 1, 1]);
      expect(result.bySeason[10].map((row) => row.user.id)).toEqual([2, 1]);
      expect(result.byUser[1].map((row) => row.season.id)).toEqual([11, 10]);
      expect(result.all[0].season.label).toBe('2022/2023');
      expect(result.all[0].user).toEqual({ color: 'blue', icon: 'b', id: 2, name: 'User Two' });
    });
  });

  describe('getUserRecords', () => {
    it('aggregates seasonal points, bullseyes, wins and top weeks', async () => {
      const FINAL_STATUS = 1;
      mockDb.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM users_season')) {
          return Promise.resolve([{ season: 10 }]);
        }
        if (sql.includes('FROM seasons_ranking')) {
          return Promise.resolve([]);
        }
        if (sql.includes('FROM users')) {
          return Promise.resolve([{ id: 1, name: 'User 1' }]);
        }
        return Promise.resolve([]);
      });
      mockMatchService.getBySeason.mockResolvedValue([
        {
          awayScore: 0,
          homeScore: 20,
          id: 1,
          season: 10,
          status: FINAL_STATUS,
          timestamp: 1,
          week: 1
        },
        {
          awayScore: 0,
          homeScore: 20,
          id: 2,
          season: 10,
          status: FINAL_STATUS,
          timestamp: 2,
          week: 2
        }
      ]);
      mockBetService.getUserMatchesBetsByMatchIds.mockResolvedValue([
        { betValue: 3, matchId: 1, userId: 1 },
        { betValue: 3, matchId: 2, userId: 1 }
      ]);
      mockBetService.getStartedMatchesBetsByMatchIds.mockResolvedValue([
        { betValue: 3, matchId: 1, userId: 1 },
        { betValue: 3, matchId: 2, userId: 1 }
      ]);

      const records = await service.getUserRecords(1);

      expect(records.seasons).toEqual([
        {
          percentage: 100,
          points: 20,
          position: 1,
          season: 10,
          seasonLabel: '2022/2023',
          totalParticipants: 1,
          totalPossiblePoints: 20
        }
      ]);
      expect(records.totalBullseyes).toBe(2);
      expect(records.totalBets).toBe(2);
      expect(records.totalWins).toBe(2);
      expect(records.topWeeks).toHaveLength(2);
      expect(records.topWeeks[0].percentage).toBe(100);
    });

    it('uses the cached seasons_ranking row instead of recalculating when present', async () => {
      const FINAL_STATUS = 1;
      mockDb.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM users_season')) {
          return Promise.resolve([{ season: 10 }]);
        }
        if (sql.includes('FROM seasons_ranking')) {
          return Promise.resolve([
            {
              bullseye: 5,
              percentage: 42.5,
              points: 99,
              position: 3,
              totalBets: 10,
              totalGames: 12,
              totalParticipants: 8,
              totalPossibleExtras: null,
              totalPossiblePoints: 200,
              winner: 4
            }
          ]);
        }
        return Promise.resolve([]);
      });
      mockMatchService.getBySeason.mockResolvedValue([
        {
          awayScore: 0,
          homeScore: 20,
          id: 1,
          season: 10,
          status: FINAL_STATUS,
          timestamp: 1,
          week: 1
        }
      ]);
      mockBetService.getUserMatchesBetsByMatchIds.mockResolvedValue([{ betValue: 3, matchId: 1, userId: 1 }]);

      const records = await service.getUserRecords(1);

      expect(records.seasons).toEqual([
        {
          percentage: 42.5,
          points: 99,
          position: 3,
          season: 10,
          seasonLabel: '2022/2023',
          totalParticipants: 8,
          totalPossiblePoints: 200
        }
      ]);
      expect(records.totalBullseyes).toBe(5);
      expect(records.totalBets).toBe(10);
      expect(records.totalWins).toBe(4);
      // seasonUsers/allBets should never be fetched when the cached ranking is present
      expect(mockBetService.getStartedMatchesBetsByMatchIds).not.toHaveBeenCalled();
    });

    it('skips seasons with no matches or that are not fully completed', async () => {
      mockDb.query.mockResolvedValueOnce([{ season: 10 }]);
      mockMatchService.getBySeason.mockResolvedValue([]);

      const records = await service.getUserRecords(1);

      expect(records.seasons).toEqual([]);
      expect(records.topWeeks).toEqual([]);
    });
  });
});

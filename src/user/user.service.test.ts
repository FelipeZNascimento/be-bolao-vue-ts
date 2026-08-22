import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({
  query: vi.fn()
}));

vi.mock('#database/db.js', () => ({ default: mockDb }));

import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
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
});

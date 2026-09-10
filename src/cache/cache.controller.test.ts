import { CacheController } from '#cache/cache.controller.js';
import { cachedInfo } from '#utils/dataCache.js';
import { NextFunction, Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('CacheController', () => {
  const controller = new CacheController();

  const getReqResNext = (): { next: NextFunction; req: Request; res: Response } => {
    const req = {} as Request;
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    } as unknown as Response;
    const next = vi.fn();
    return { next, req, res };
  };

  afterEach(() => {
    cachedInfo.flushAll();
    vi.restoreAllMocks();
  });

  it('returns stats and entries with value previews and expiry', async () => {
    cachedInfo.set('foo', { a: 1 }, 100);
    const { next, req, res } = getReqResNext();

    await controller.getOverview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      data: { entries: { expiresAt: string | null; key: string; valuePreview: string }[]; stats: unknown };
      success: boolean;
    };
    expect(payload.success).toBe(true);
    expect(payload.data.stats).toBeDefined();
    expect(payload.data.entries).toHaveLength(1);
    expect(payload.data.entries[0].key).toBe('foo');
    expect(payload.data.entries[0].valuePreview).toBe(JSON.stringify({ a: 1 }));
    expect(payload.data.entries[0].expiresAt).not.toBeNull();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns empty entries when cache is empty', async () => {
    const { next, req, res } = getReqResNext();

    await controller.getOverview(req, res, next);

    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      data: { entries: unknown[] };
    };
    expect(payload.data.entries).toHaveLength(0);
    expect(next).not.toHaveBeenCalled();
  });

  it('getEntry returns the full value and expiry for an existing key', async () => {
    cachedInfo.set('foo', { a: 1 }, 100);
    const { next, req, res } = getReqResNext();
    req.params = { key: 'foo' };

    await controller.getEntry(req, res, next);

    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      data: { expiresAt: string | null; key: string; value: unknown };
    };
    expect(payload.data.key).toBe('foo');
    expect(payload.data.value).toEqual({ a: 1 });
    expect(payload.data.expiresAt).not.toBeNull();
    expect(next).not.toHaveBeenCalled();
  });

  it('getEntry returns null value for a missing key', async () => {
    const { next, req, res } = getReqResNext();
    req.params = { key: 'missing' };

    await controller.getEntry(req, res, next);

    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      data: { value: unknown };
    };
    expect(payload.data.value).toBeNull();
    expect(next).not.toHaveBeenCalled();
  });
});

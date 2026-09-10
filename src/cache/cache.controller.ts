import { BaseController } from '#shared/base.controller.js';
import { cachedInfo } from '#utils/dataCache.js';
import { NextFunction, Request, Response } from 'express';

export class CacheController extends BaseController {
  getOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, () => {
      const stats = cachedInfo.getStats();
      const keys = cachedInfo.keys();
      console.log(keys);

      const entries = keys.map((key) => {
        const ttl = cachedInfo.getTtl(key);
        const value = cachedInfo.get(key);
        let valuePreview: string;
        try {
          valuePreview = JSON.stringify(value)?.slice(0, 200) ?? String(value);
        } catch {
          valuePreview = String(value);
        }

        return {
          expiresAt: ttl ? new Date(ttl).toISOString() : null,
          key,
          valuePreview
        };
      });

      return Promise.resolve({ entries, stats });
    });
  };

  getEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, () => {
      const key = req.params.key as string;
      const value = cachedInfo.get(key);
      const ttl = cachedInfo.getTtl(key);

      return Promise.resolve({
        expiresAt: ttl ? new Date(ttl).toISOString() : null,
        key,
        value: value ?? null
      });
    });
  };
}

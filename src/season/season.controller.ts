import { MatchService } from "#match/match.service.ts";
import { BaseController } from "#shared/base.controller.ts";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.ts";
import { NextFunction, Request, Response } from "express";

export class SeasonController extends BaseController {
  constructor(private matchService: MatchService) {
    super();
  }

  getCurrentSeasonAndWeek = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = process.env.SEASON;
      const seasonStart = process.env.SEASON_START;
      let currentWeek: number | undefined = cachedInfo.get(CACHE_KEYS.CURRENT_WEEK);

      if (!currentWeek) {
        currentWeek = await this.matchService.getCurrentWeek();
        cachedInfo.set(CACHE_KEYS.CURRENT_WEEK, currentWeek);
      }

      return {
        currentSeason: season ? parseInt(season) : null,
        currentWeek: currentWeek ? currentWeek : null,
        seasonStart: seasonStart ? parseInt(seasonStart) : null,
      };
    });
  };
}

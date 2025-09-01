import { MatchService } from "#match/match.service.ts";
import { BaseController } from "#shared/base.controller.ts";
import { ErrorCode } from "#shared/errorCodes.ts";
import { ErrorHandler } from "#shared/errorHandler.ts";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.ts";
import { NextFunction, Request, Response } from "express";

export class MatchController extends BaseController {
  constructor(private matchService: MatchService) {
    super();
  }

  getBySeasonWeek = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const season = req.params.season || process.env.SEASON;
    let week: number | undefined = parseInt(req.params.week) || cachedInfo.get(CACHE_KEYS.CURRENT_WEEK);

    if (!week || isNaN(week)) {
      const currentWeek = await this.matchService.getCurrentWeek();
      cachedInfo.set(CACHE_KEYS.CURRENT_WEEK, currentWeek);
      week = currentWeek;
    }

    if (!season || !week) {
      throw new ErrorHandler("Missing required field", 400, ErrorCode.MISSING_REQUIRED_FIELD);
    }

    await this.handleRequest(req, res, next, async () => {
      return await this.matchService.getBySeasonWeek(parseInt(season), week);
    });
  };
}

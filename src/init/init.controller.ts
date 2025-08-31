import { InitService } from "#init/init.service.ts";
import { BaseController } from "#shared/base.controller.ts";
import { ErrorCode } from "#shared/errorCodes.ts";
import { ErrorHandler } from "#shared/errorHandler.ts";
import { TeamService } from "#team/team.service.ts";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.ts";
import { NextFunction, Request, Response } from "express";

export class InitController extends BaseController {
  constructor(
    private initService: InitService,
    private teamService: TeamService,
  ) {
    super();
  }

  getInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const currentSeason = process.env.SEASON;
    // const seasonStart = process.env.SEASON_START;

    if (!currentSeason) {
      throw new ErrorHandler("Missing required field", 400, ErrorCode.MISSING_REQUIRED_FIELD);
    }

    await this.handleRequest(req, res, next, async () => {
      let teams = cachedInfo.get(CACHE_KEYS.TEAMS);
      if (teams === undefined) {
        teams = await this.teamService.getAll();
        cachedInfo.set(CACHE_KEYS.TEAMS, teams);
      }
      const seasonInfo = await this.initService.getInfo(parseInt(currentSeason));
      return {
        currentSeason: seasonInfo,
      };
    });
  };
}

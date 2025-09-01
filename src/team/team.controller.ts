import { BaseController } from "#shared/base.controller.ts";
import { ITeam, TeamService } from "#team/team.service.ts";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.ts";
import { NextFunction, Request, Response } from "express";

export class TeamController extends BaseController {
  constructor(private teamService: TeamService) {
    super();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const cachedTeams = cachedInfo.get(CACHE_KEYS.TEAMS);
    if (cachedTeams) {
      this.handleRequestFromCache(req, res, next, cachedTeams);
      return;
    }

    await this.handleRequest(req, res, next, async () => {
      const response = await this.teamService.getAll();
      cachedInfo.set(CACHE_KEYS.TEAMS, response);
      return response as unknown as ITeam;
    });
  };
}

import { BaseController } from "#shared/base.controller.ts";
import { ITeam, TeamService } from "#team/team.service.ts";
import { NextFunction, Request, Response } from "express";

export class TeamController extends BaseController {
  constructor(private teamService: TeamService) {
    super();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const response = await this.teamService.getAll();
      return response as unknown as ITeam;
    });
  };
}

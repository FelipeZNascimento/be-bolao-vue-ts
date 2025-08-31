import { MatchService } from "#match/match.service.ts";
import { BaseController } from "#shared/base.controller.ts";
import { ErrorCode } from "#shared/errorCodes.ts";
import { ErrorHandler } from "#shared/errorHandler.ts";
import { NextFunction, Request, Response } from "express";

export class MatchController extends BaseController {
  constructor(private matchService: MatchService) {
    super();
  }

  getBySeasonWeek = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const season = req.params.season || process.env.SEASON;
    const { week } = req.params;

    if (!season || !week || isNaN(parseInt(season)) || isNaN(parseInt(week))) {
      throw new ErrorHandler("Missing required field", 400, ErrorCode.MISSING_REQUIRED_FIELD);
    }

    await this.handleRequest(req, res, next, async () => {
      return await this.matchService.getBySeasonWeek(parseInt(season), parseInt(week));
    });
  };
}

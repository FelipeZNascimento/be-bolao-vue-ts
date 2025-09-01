import { BetService } from "#bet/bet.service.ts";
import { BaseController } from "#shared/base.controller.ts";
import { ErrorCode } from "#shared/errorCodes.ts";
import { ErrorHandler } from "#shared/errorHandler.ts";
import { NextFunction, Request, Response } from "express";

export class BetController extends BaseController {
  constructor(private betService: BetService) {
    super();
  }

  getExtras = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = req.params.season || process.env.SEASON;
      const seasonStart = process.env.SEASON_START;
      if (!season || !seasonStart) {
        throw new ErrorHandler("Missing required field", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      console.log(seasonStart);
      return await this.betService.getExtras(parseInt(season), parseInt(seasonStart));
    });
  };
}

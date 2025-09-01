import { BaseController } from "#shared/base.controller.ts";
import { ErrorCode } from "#shared/errorCodes.ts";
import { ErrorHandler } from "#shared/errorHandler.ts";
import { IUser, UserService } from "#user/user.service.ts";
import { NextFunction, Request, Response } from "express";

export class UserController extends BaseController {
  constructor(private userService: UserService) {
    super();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = req.params.season || process.env.SEASON;
      if (!season) {
        throw new ErrorHandler("Missing required field", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const response: IUser[] = await this.userService.getBySeason(parseInt(season));
      return response;
    });
  };
}

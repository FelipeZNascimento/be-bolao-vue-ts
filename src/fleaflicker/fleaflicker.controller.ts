import { FleaflickerService } from '#fleaflicker/fleaflicker.service.js';
import { BaseController } from '#shared/base.controller.js';
import { AppError } from '#utils/appError.js';
import { ErrorCode } from '#utils/errorCodes.js';
import { validateRequestBody, validateRequestParams } from '#utils/requestValidation.utils.js';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const setFleaflickerInfoSchema = z.object({
  leagueId: z.number(),
  teamId: z.number()
});

const getRosterParamsSchema = z.object({
  leagueId: z.string(),
  teamId: z.string()
});

const getStandingsParamsSchema = z.object({
  leagueId: z.string()
});

const getBoxscoreParamsSchema = z.object({
  leagueId: z.string(),
  scoringPeriod: z.string().optional()
});

export class FleaflickerController extends BaseController {
  constructor(private fleaflickerService: FleaflickerService) {
    super();
  }

  getRoster = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { leagueId, teamId } = validateRequestParams(getRosterParamsSchema, req.params);
      return await this.fleaflickerService.getRoster(leagueId, teamId);
    });
  };

  getBoxscore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { leagueId, scoringPeriod } = validateRequestParams(getBoxscoreParamsSchema, req.params);
      return await this.fleaflickerService.getBoxscore(leagueId, scoringPeriod);
    });
  };

  getStandings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { leagueId } = validateRequestParams(getStandingsParamsSchema, req.params);
      return await this.fleaflickerService.getStandings(leagueId);
    });
  };

  setFleaflickerInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { user } = req.session;
      if (!user) {
        throw new AppError('Sem sessão ativa', 401, ErrorCode.UNAUTHORIZED);
      }

      const { leagueId, teamId } = validateRequestBody(setFleaflickerInfoSchema, req.body);
      const response = await this.fleaflickerService.setFleaflickerInfo(user.id, leagueId, teamId);

      if (response.affectedRows > 0) {
        req.session.user = { ...user, fleaflicker: { leagueId, teamId } };
      }

      return response;
    });
  };

  deleteFleaflickerInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { user } = req.session;
      if (!user) {
        throw new AppError('Sem sessão ativa', 401, ErrorCode.UNAUTHORIZED);
      }

      const response = await this.fleaflickerService.deleteFleaflickerInfo(user.id);

      if (response.affectedRows > 0) {
        req.session.user = { ...user, fleaflicker: null };
      }

      return response;
    });
  };
}

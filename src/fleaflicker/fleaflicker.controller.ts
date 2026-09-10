import { FleaflickerService } from '#fleaflicker/fleaflicker.service.js';
import { BaseController } from '#shared/base.controller.js';
import { validateRequestBody, validateRequestParams, validateRequestQuery } from '#utils/requestValidation.utils.js';
import { getAuthenticatedUser } from '#utils/session.utils.js';
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
  leagueId: z.string()
});

const getBoxscoreQuerySchema = z.object({
  gameId: z.string().optional(),
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
      const { leagueId } = validateRequestParams(getBoxscoreParamsSchema, req.params);
      const { gameId, scoringPeriod } = validateRequestQuery(getBoxscoreQuerySchema, req.query);

      if (gameId) {
        return await this.fleaflickerService.getLeagueBoxscore(leagueId, gameId);
      }

      return await this.fleaflickerService.getLeagueScoreboard(leagueId, scoringPeriod);
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
      const user = getAuthenticatedUser(req);

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
      const user = getAuthenticatedUser(req);

      const response = await this.fleaflickerService.deleteFleaflickerInfo(user.id);

      if (response.affectedRows > 0) {
        req.session.user = { ...user, fleaflicker: null };
      }

      return response;
    });
  };
}

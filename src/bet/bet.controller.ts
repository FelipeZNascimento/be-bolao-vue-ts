import { BetService } from "#bet/bet.service.ts";
import { MatchService } from "#match/match.service.ts";
import { BaseController } from "#shared/base.controller.ts";
import { TeamService } from "#team/team.service.ts";
import { ITeam } from "#team/team.types.ts";
import { getFromCacheOrFetch } from "#team/team.util.ts";
import { UserService } from "#user/user.service.ts";
import { AppError } from "#utils/appError.ts";
import { ErrorCode } from "#utils/errorCodes.ts";
import { NextFunction, Request, Response } from "express";

import { IExtraBet } from "./bet.types.ts";
import { processExtraBets } from "./bet.utils.ts";

export class BetController extends BaseController {
  constructor(
    private betService: BetService,
    private matchService: MatchService,
    private userService: UserService,
    private teamService: TeamService,
  ) {
    super();
  }

  getExtras = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (req.session.user) {
        void this.userService.updateLastOnlineTime(req.session.user.id);
      }

      const season = req.params.season || process.env.SEASON;
      const seasonStart = process.env.SEASON_START;
      if (!seasonStart) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      if (!season) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const extraBets: IExtraBet[] = await this.betService.getExtras(parseInt(season), parseInt(seasonStart));
      const teams: ITeam[] = await getFromCacheOrFetch(this.teamService);

      return extraBets.map((bet) => ({
        bets: processExtraBets(extraBets.find((b) => b.idUser === bet.idUser)?.json ?? "", teams),
        user: {
          color: bet.userColor,
          icon: bet.userIcon,
          id: bet.idUser,
          name: bet.userName,
        },
      }));
    });
  };

  getExtrasResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (req.session.user) {
        void this.userService.updateLastOnlineTime(req.session.user.id);
      }

      const season = req.params.season || process.env.SEASON;
      const seasonStart = process.env.SEASON_START;

      if (!seasonStart) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      if (!season) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      console.log("Fetching extras results for season", season, "and seasonStart", seasonStart);
      const extraBetsResults: IExtraBet = await this.betService.getExtrasResults(
        parseInt(season),
        parseInt(seasonStart),
      );
      const teams: ITeam[] = await getFromCacheOrFetch(this.teamService);

      // return extraBetsResults.map((bet) => ({
      //   bets: processExtraBets(extraBetsResults.find((b) => b.idUser === bet.idUser)?.json ?? "", teams),
      // }));
      return {
        bets: processExtraBets(extraBetsResults.json, teams),
      };
    });
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.session.user) {
        throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
      }

      const user = req.session.user;

      void this.userService.updateLastOnlineTime(user.id);

      const reqBody = req.body as { betValue: number; matchId: number };
      const { betValue, matchId } = reqBody;

      const matchResponse = await this.matchService.getTimestampByMatchId(matchId);
      const nowTimestamp = Math.floor(new Date().getTime() / 1000);
      if (matchResponse && matchResponse.timestamp < nowTimestamp) {
        throw new AppError("Não autorizado a fazer apostas nesta partida", 401, ErrorCode.UNAUTHORIZED);
      }

      if (matchResponse) {
        await this.betService.update(betValue, matchId, user.id);
        return {}; // to satisfy void response
      }
    });
  };

  updateExtra = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      if (!req.session.user) {
        throw new AppError("Sem sessão ativa", 401, ErrorCode.UNAUTHORIZED);
      }

      const user = req.session.user;
      const nowTimestamp = Math.floor(new Date().getTime() / 1000);
      const seasonStart = process.env.SEASON_START;
      const season = process.env.SEASON;

      void this.userService.updateLastOnlineTime(user.id);

      const reqBody = req.body as Record<string, null | number | number[]>;
      const newExtraBets = reqBody;

      if (!seasonStart || !season) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      if (nowTimestamp >= parseInt(seasonStart)) {
        throw new AppError("Não autorizado! A temporada já começou.", 401, ErrorCode.UNAUTHORIZED);
      }

      await this.betService.updateExtras(JSON.stringify(newExtraBets), user.id, season);
    });
  };
}

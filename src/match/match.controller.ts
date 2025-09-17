import { BetService } from "#bet/bet.service.ts";
import { IBet } from "#bet/bet.types.ts";
import { MatchService } from "#match/match.service.ts";
import { BaseController } from "#shared/base.controller.ts";
import { TeamService } from "#team/team.service.ts";
import { ITeam } from "#team/team.types.ts";
import { getFromCacheOrFetch, setTeamsCache } from "#team/team.util.ts";
import { UserService } from "#user/user.service.ts";
import { isFulfilled, isRejected } from "#utils/apiResponse.ts";
import { AppError } from "#utils/appError.ts";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.ts";
import { ErrorCode } from "#utils/errorCodes.ts";
import { WebSocketService } from "#websocket/websocket.service.ts";
import { NextFunction, Request, Response } from "express";

import { MATCH_STATUS, MatchStatus } from "./match.constants.ts";
import { IMatch } from "./match.types.ts";
import { parseQueryResponse } from "./match.utils.ts";

export class MatchController extends BaseController {
  constructor(
    private matchService: MatchService,
    private userService: UserService,
    private betService: BetService,
    private teamService: TeamService,
    private websocketInstance: WebSocketService,
  ) {
    super();
  }

  getBySeasonWeek = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      let user = null;
      if (req.session.user) {
        user = req.session.user;
        void this.userService.updateLastOnlineTime(req.session.user.id);
      }

      const season = req.params.season || process.env.SEASON;
      let week: number | undefined = parseInt(req.params.week) || cachedInfo.get(CACHE_KEYS.CURRENT_WEEK);

      if (!week || isNaN(week)) {
        const currentWeek = await this.matchService.getCurrentWeek();
        cachedInfo.set(CACHE_KEYS.CURRENT_WEEK, currentWeek);
        week = currentWeek;
      }

      if (!season || !week) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      const teams: ITeam[] = await getFromCacheOrFetch(this.teamService);
      const matchesResponse: IMatch[] = await this.matchService.getBySeasonWeek(parseInt(season), week);
      const matchesIds = matchesResponse.map((match) => match.id);

      const queries = [this.betService.getStartedMatchesBetsByMatchIds(matchesIds)];

      if (user) {
        queries.push(this.betService.getUserMatchesBetsByMatchIds(matchesIds, user.id));
      }
      const [startedMatchesBetsResponse, userBetsResponse] = await Promise.allSettled(queries);

      // Only throw if user or matches fetch failed
      if (isRejected(startedMatchesBetsResponse) || (user && isRejected(userBetsResponse))) {
        throw new AppError("Base de dados inacessível", 204, ErrorCode.DB_ERROR);
      }

      const startedMatchesBets: IBet[] = isFulfilled(startedMatchesBetsResponse)
        ? startedMatchesBetsResponse.value
        : [];
      let userBets: IBet[] = [];
      if (user) {
        userBets = isFulfilled(userBetsResponse) ? userBetsResponse.value : [];
      }

      const matchesObject = matchesResponse.map((match) => {
        const user = req.session.user;
        let loggedUserBetsObject = null;

        if (user) {
          loggedUserBetsObject = userBets
            .filter((bet) => bet.matchId === match.id && bet.userId === user.id)
            .map((bet) => ({
              id: bet.id,
              matchId: bet.matchId,
              user: {
                color: bet.userColor,
                icon: bet.userIcon,
                id: bet.userId,
                name: bet.userName,
              },
              value: bet.betValue,
            }))[0];
        }

        const allBetsObject = startedMatchesBets
          .filter((bet) => bet.matchId === match.id && bet.userId !== user?.id)
          .sort((a, b) => a.userName.localeCompare(b.userName))
          .map((bet) => ({
            id: bet.id,
            matchId: bet.matchId,
            user: {
              color: bet.userColor,
              icon: bet.userIcon,
              id: bet.userId,
              name: bet.userName,
            },
            value: bet.betValue,
          }));

        const awayTeam = teams.find((team) => team.id === match.idTeamAway);
        const homeTeam = teams.find((team) => team.id === match.idTeamHome);

        if (!awayTeam || !homeTeam) {
          throw new AppError("Equipe não encontrada", 400, ErrorCode.MISSING_REQUIRED_FIELD);
        }

        const parsedResponse = parseQueryResponse(match, homeTeam, awayTeam);

        return {
          ...parsedResponse,
          bets: allBetsObject,
          loggedUserBets: loggedUserBetsObject,
        };
      });

      return {
        matches: matchesObject,
        season: season,
        week: week,
      };
    });
  };

  updateFromKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const teams: ITeam[] = await getFromCacheOrFetch(this.teamService);
      const season = process.env.SEASON;
      let updateResponse;

      if (!season) {
        throw new AppError("Erro de inicialização", 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const { key } = req.params;
      if (key !== process.env.API_UPDATE_KEY) {
        throw new AppError("Chave inválida", 401, ErrorCode.UNAUTHORIZED);
      }

      const reqBody = req.body as {
        awayPoints: null | number;
        awayTeamCode: string;
        awayWinLosses?: string;
        clock: null | string;
        homePoints: null | number;
        homeTeamCode: string;
        homeTeamOdds: null | string;
        homeWinLosses?: string;
        overUnder: null | string;
        possession: "away" | "home" | null;
        status: MatchStatus;
        week: null | number;
      };

      const {
        awayPoints,
        awayTeamCode,
        awayWinLosses,
        clock,
        homePoints,
        homeTeamCode,
        homeTeamOdds,
        homeWinLosses,
        overUnder,
        possession,
        status,
        week,
      } = reqBody;

      if (homeWinLosses) {
        const homeTeamIndex = teams.findIndex((team) => team.code === homeTeamCode);
        if (homeTeamIndex !== -1) {
          teams[homeTeamIndex].homeWinLosses = homeWinLosses;
        }
      }

      if (awayWinLosses) {
        const awayTeamIndex = teams.findIndex((team) => team.code === awayTeamCode);
        if (awayTeamIndex !== -1) {
          teams[awayTeamIndex].awayWinLosses = awayWinLosses;
        }
      }

      if (awayWinLosses || homeWinLosses) {
        setTeamsCache(teams);
      }

      if (
        status === MATCH_STATUS.NOT_STARTED &&
        awayTeamCode &&
        homeTeamCode &&
        homeTeamOdds !== null &&
        overUnder !== null &&
        week !== null
      ) {
        // If match has not started, we can only update odds info
        updateResponse = await this.matchService.updateOddsByMatchInfo(
          overUnder,
          homeTeamOdds,
          awayTeamCode,
          homeTeamCode,
          week,
          status,
          parseInt(season),
        );
      } else if (
        status !== MATCH_STATUS.NOT_STARTED &&
        awayTeamCode &&
        homeTeamCode &&
        awayPoints !== null &&
        homePoints !== null &&
        status &&
        week !== null
      ) {
        // If match has started, we can update all info
        updateResponse = await this.matchService.updateByMatchInfo(
          awayPoints,
          homePoints,
          status,
          possession,
          clock,
          awayTeamCode,
          homeTeamCode,
          week,
          parseInt(season),
        );
      } else {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      if (updateResponse.affectedRows === 0) {
        const season = process.env.SEASON;
        const week = cachedInfo.get<number>(CACHE_KEYS.CURRENT_WEEK);
        if (season && week) {
          const updatedMatches = await this.matchService.getBySeasonWeek(parseInt(season), week);
          const parsedMatches = updatedMatches.map((match) => {
            const awayTeam = teams.find((team) => team.id === match.idTeamAway);
            const homeTeam = teams.find((team) => team.id === match.idTeamHome);

            if (!awayTeam || !homeTeam) {
              throw new AppError("Equipe não encontrada", 400, ErrorCode.MISSING_REQUIRED_FIELD);
            }

            return parseQueryResponse(match, homeTeam, awayTeam);
          });
          this.websocketInstance.broadcast(JSON.stringify(parsedMatches));
        }
      }
      return updateResponse;
    });
  };
}

import type { IBet } from "#bet/bet.types.js";
import type { IMatch } from "#match/match.types.js";
import type { ITeam } from "#team/team.types.js";

import { BetService } from "#bet/bet.service.js";
import { MATCH_STATUS, MatchStatus } from "#match/match.constants.js";
import { MatchService } from "#match/match.service.js";
import { mergeBetsToMatches } from "#match/match.utils.js";
import { RankingController } from "#ranking/ranking.controller.js";
import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { getFromCacheOrFetch, setTeamsCache } from "#team/team.util.js";
import { UserService } from "#user/user.service.js";
import { isFulfilled, isRejected } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { WebSocketService } from "#websocket/websocket.service.js";
import { NextFunction, Request, Response } from "express";

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
      let matchesObject = [];
      try {
        matchesObject = mergeBetsToMatches(teams, matchesResponse, startedMatchesBets, userBets, user?.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        throw new AppError(
          `Erro ao mesclar apostas com partidas: ${errorMessage}`,
          500,
          ErrorCode.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        matches: matchesObject,
        season: season,
        week: week,
      };
    });
  };

  updateFromKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = process.env.SEASON;
      const seasonStart = process.env.SEASON_START;
      const teams: ITeam[] = await getFromCacheOrFetch(this.teamService);
      let updateResponse;

      if (!season || !seasonStart) {
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
          possession ?? null,
          clock ?? null,
          awayTeamCode,
          homeTeamCode,
          week,
          parseInt(season),
        );
      } else {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      // If any match was updated, we need to update ranking and send websocket message
      if (updateResponse.affectedRows > 0) {
        const rankingController = new RankingController(
          this.userService,
          this.matchService,
          this.teamService,
          this.betService,
        );

        // Update ranking
        const { seasonRanking, weeklyRanking } = await rankingController.calculateRanking(
          parseInt(season),
          parseInt(seasonStart),
        );

        const currentWeek = cachedInfo.get<number>(CACHE_KEYS.CURRENT_WEEK);
        // Fetch updated matches for the week
        if (season && currentWeek) {
          const updatedMatches = await this.matchService.getBySeasonWeek(parseInt(season), currentWeek);
          const matchesIds = updatedMatches.map((match) => match.id);
          const startedMatchesBets = await this.betService.getStartedMatchesBetsByMatchIds(matchesIds);
          const user = req.session.user ?? null;

          const matchesObject = mergeBetsToMatches(teams, updatedMatches, startedMatchesBets, [], user?.id);
          this.websocketInstance.broadcast(
            JSON.stringify({ matches: matchesObject, ranking: { seasonRanking, weeklyRanking }, week: week }),
          );
        }
      }
      return updateResponse;
    });
  };
}

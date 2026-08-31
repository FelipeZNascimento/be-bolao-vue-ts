import type { IBet } from '#bet/bet.types.js';
import type { IMatch, IMatchSummary } from '#match/match.types.js';
import type { ITeam } from '#team/team.types.js';

import { BetService } from '#bet/bet.service.js';
import { MATCH_STATUS, MatchStatus } from '#match/match.constants.js';
import { MatchService } from '#match/match.service.js';
import { mergeBetsToMatches } from '#match/match.utils.js';
import { RankingController } from '#ranking/ranking.controller.js';
import { BaseController } from '#shared/base.controller.js';
import { TeamService } from '#team/team.service.js';
import { getFromCacheOrFetch, setTeamsCache } from '#team/team.util.js';
import { UserService } from '#user/user.service.js';
import { isFulfilled, isRejected } from '#utils/apiResponse.js';
import { AppError } from '#utils/appError.js';
import { CACHE_KEYS, cachedInfo } from '#utils/dataCache.js';
import { ErrorCode } from '#utils/errorCodes.js';
import { validateRequestBody, validateRequestParams } from '#utils/requestValidation.utils.js';
import { WebSocketService } from '#websocket/websocket.service.js';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const getMoreDetailsBodySchema = z.object({
  status: z.number()
});
const getMoreDetailsParamsSchema = z.object({
  espnId: z.string()
});

const getBySeasonWeekParamsSchema = z.object({
  season: z.string().optional(),
  week: z.string().optional()
});

const updateFromKeySchema = z.object({
  awayPoints: z.number().nullable(),
  awayTeamCode: z.string(),
  awayWinLosses: z.string().optional(),
  clock: z.string().nullable(),
  homePoints: z.number().nullable(),
  homeTeamCode: z.string(),
  homeTeamOdds: z.string().nullable(),
  homeWinLosses: z.string().optional(),
  overUnder: z.string().nullable(),
  possession: z.enum(['away', 'home']).nullable(),
  status: z.number(),
  week: z.number().nullable()
});

export class MatchController extends BaseController {
  constructor(
    private matchService: MatchService,
    private userService: UserService,
    private betService: BetService,
    private teamService: TeamService,
    private websocketInstance: WebSocketService
  ) {
    super();
  }

  getMoreDetails = async (req: Request<{ espnId: string }>, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const { espnId } = validateRequestParams(getMoreDetailsParamsSchema, req.params);
      const { status } = validateRequestBody(getMoreDetailsBodySchema, req.body);

      const isFinished = status === MATCH_STATUS.FINAL || status === MATCH_STATUS.FINAL_OVERTIME;
      const cached = this.getMatchDetailsFromCache(espnId);

      if (cached) {
        const cacheAge = Date.now() - cached.timestamp;
        const cacheIsFresh = cacheAge < 60 * 1000;

        // Finished match, and cache also says finished: cache is definitive, return it
        if (isFinished && cached.isFinished) {
          return cached.matchDetails;
        }

        // Not finished, and cache is still fresh: return it
        if (!isFinished && cacheIsFresh) {
          return cached.matchDetails;
        }

        // Otherwise (finished but cache says not finished, or not finished and cache is stale): refetch
      }

      return await this.refreshMatchDetailsCache(espnId, isFinished);
    });
  };

  private getMatchDetailsCacheKey(espnId: number | string): string {
    return `${CACHE_KEYS.MATCH_DETAILS}:${espnId}`;
  }

  private getMatchDetailsFromCache(espnId: number | string) {
    return cachedInfo.get<{ isFinished: boolean; matchDetails: IMatchSummary; timestamp: number }>(
      this.getMatchDetailsCacheKey(espnId)
    );
  }

  private async refreshMatchDetailsCache(espnId: number | string, isFinished: boolean): Promise<IMatchSummary> {
    const matchDetails = await this.matchService.getMoreDetails(parseInt(espnId.toString()));
    cachedInfo.set(this.getMatchDetailsCacheKey(espnId), { isFinished, matchDetails, timestamp: Date.now() });

    return matchDetails;
  }

  getBySeasonWeek = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      let user = req.session.user;

      const { season: paramsSeason, week: paramsWeek } = validateRequestParams(getBySeasonWeekParamsSchema, req.params);

      const season = paramsSeason || process.env.SEASON;
      let week: number | undefined = parseInt(paramsWeek ?? '');

      if (week === undefined || isNaN(week)) {
        const currentWeek = await this.matchService.getCurrentWeek();
        cachedInfo.set(CACHE_KEYS.CURRENT_WEEK, currentWeek);
        week = currentWeek;
      }

      if (!season || isNaN(week)) {
        throw new AppError('Campo obrigatório ausente', 400, ErrorCode.MISSING_REQUIRED_FIELD);
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
        throw new AppError('Base de dados inacessível', 204, ErrorCode.DB_ERROR);
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
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        throw new AppError(
          `Erro ao mesclar apostas com partidas: ${errorMessage}`,
          500,
          ErrorCode.INTERNAL_SERVER_ERROR
        );
      }

      return {
        matches: matchesObject,
        season: season,
        week: week
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
        throw new AppError('Erro de inicialização', 404, ErrorCode.INTERNAL_SERVER_ERROR);
      }

      const { key } = req.params;
      if (key !== process.env.API_UPDATE_KEY) {
        throw new AppError('Chave inválida', 401, ErrorCode.UNAUTHORIZED);
      }

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
        status: rawStatus,
        week
      } = validateRequestBody(updateFromKeySchema, req.body);
      const status = rawStatus as MatchStatus;

      if (homeWinLosses) {
        const homeTeamIndex = teams.findIndex((team) => team.code === homeTeamCode);
        if (homeTeamIndex !== -1) {
          teams[homeTeamIndex].winLosses = homeWinLosses;
        }
      }

      if (awayWinLosses) {
        const awayTeamIndex = teams.findIndex((team) => team.code === awayTeamCode);
        if (awayTeamIndex !== -1) {
          teams[awayTeamIndex].winLosses = awayWinLosses;
        }
      }

      if (awayWinLosses || homeWinLosses) {
        setTeamsCache(teams);
      }

      const matchInfo =
        awayTeamCode && homeTeamCode && week !== null
          ? await this.matchService.getIdByMatchInfo(awayTeamCode, homeTeamCode, week, parseInt(season))
          : undefined;

      if (!awayTeamCode || !homeTeamCode || week === null) {
        throw new AppError('Campo obrigatório ausente', 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      if (status === MATCH_STATUS.NOT_STARTED) {
        if (homeTeamOdds === null || overUnder === null) {
          throw new AppError('Campo obrigatório ausente ao atualizar odds', 400, ErrorCode.MISSING_REQUIRED_FIELD);
        }

        // If match has not started, we can only update odds info
        updateResponse = await this.matchService.updateOddsByMatchInfo(
          overUnder,
          homeTeamOdds,
          awayTeamCode,
          homeTeamCode,
          week,
          status,
          parseInt(season)
        );
      } else {
        if (awayPoints === null || homePoints === null) {
          throw new AppError('Campo obrigatório ausente ao atualizar placar', 400, ErrorCode.MISSING_REQUIRED_FIELD);
        }

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
          parseInt(season)
        );
      }

      console.info('[MatchController.updateFromKey] matchInfo:', matchInfo);
      console.info('[MatchController.updateFromKey] affectedRows:', updateResponse.affectedRows);

      // If any match was updated, we need to update ranking and send websocket message
      if (updateResponse.affectedRows > 0) {
        if (matchInfo?.espnId) {
          const isFinished = status === MATCH_STATUS.FINAL || status === MATCH_STATUS.FINAL_OVERTIME;
          await this.refreshMatchDetailsCache(matchInfo.espnId, isFinished);
        }

        const rankingController = new RankingController(
          this.userService,
          this.matchService,
          this.teamService,
          this.betService
        );

        // Update ranking
        const { seasonRanking, weeklyRanking } = await rankingController.calculateRanking(
          parseInt(season),
          parseInt(seasonStart)
        );

        let currentWeek = cachedInfo.get<number>(CACHE_KEYS.CURRENT_WEEK);
        if (!currentWeek) {
          currentWeek = await this.matchService.getCurrentWeek();
          cachedInfo.set(CACHE_KEYS.CURRENT_WEEK, currentWeek, 60 * 60 * 4); // Cache for 4 hours
        }

        console.info('[MatchController.updateFromKey] season:', season, 'currentWeek:', currentWeek);

        // Fetch updated matches for the week
        if (season !== null && currentWeek !== null && currentWeek !== undefined) {
          const updatedMatches = await this.matchService.getBySeasonWeek(parseInt(season), currentWeek);
          const matchesIds = updatedMatches.map((match) => match.id);
          const startedMatchesBets = await this.betService.getStartedMatchesBetsByMatchIds(matchesIds);
          const user = req.session.user ?? null;

          const matchesObject = mergeBetsToMatches(teams, updatedMatches, startedMatchesBets, [], user?.id);
          const payload = JSON.stringify({
            matches: matchesObject,
            ranking: { seasonRanking, weeklyRanking },
            week: week
          });
          console.info('[MatchController.updateFromKey] broadcasting payload, length:', payload.length);
          this.websocketInstance.broadcast(payload);
        } else {
          console.warn('[MatchController.updateFromKey] skipping broadcast: missing season or currentWeek');
        }
      }
      return { ...updateResponse, matchId: matchInfo?.id, matchEspnId: matchInfo?.espnId };
    });
  };
}

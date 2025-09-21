import type { IMatch } from "#match/match.types.ts";
import type { ITeam } from "#team/team.types.ts";
import type { NextFunction, Request, Response } from "express";

import { BetService } from "#bet/bet.service.ts";
import { MatchService } from "#match/match.service.ts";
import { RankingService } from "#ranking/ranking.service.ts";
import { BaseController } from "#shared/base.controller.ts";
import { TeamService } from "#team/team.service.ts";
import { UserService } from "#user/user.service.ts";
import { isFulfilled, isRejected } from "#utils/apiResponse.ts";
import { AppError } from "#utils/appError.ts";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.ts";
import { ErrorCode } from "#utils/errorCodes.ts";

import type { IRankingLine } from "./ranking.types.ts";

import { buildSeasonUserRanking, buildWeeklyUserRanking, calculateMaxPoints, isWeekLocked } from "./ranking.utils.ts";

export class RankingController extends BaseController {
  private betService: BetService;
  private matchService: MatchService;
  private rankingService: RankingService;
  private teamService: TeamService;
  private userService: UserService;

  constructor(
    rankingService: RankingService,
    userService: UserService,
    matchService: MatchService,
    teamService: TeamService,
    betService: BetService,
  ) {
    super();
    this.rankingService = rankingService;
    this.userService = userService;
    this.matchService = matchService;
    this.teamService = teamService;
    this.betService = betService;
  }

  getSeason = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = req.params.season || process.env.SEASON;
      const seasonStart = process.env.SEASON_START;

      if (!season || !seasonStart) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      let teams: ITeam[] = cachedInfo.get(CACHE_KEYS.TEAMS) ?? [];

      if (teams.length === 0) {
        teams = await this.teamService.getAll();
        cachedInfo.set(CACHE_KEYS.TEAMS, teams);
      }

      const [userResponse, startedMatchesResponse, extrasResponse, extrasResultsResponse] = await Promise.allSettled([
        this.userService.getBySeason(parseInt(season)),
        this.matchService.getMatchesBySeason(parseInt(season)),
        this.betService.getExtras(parseInt(season), parseInt(seasonStart)),
        this.betService.getExtrasResults(parseInt(season), parseInt(seasonStart)),
      ]);

      // Only throw if user or matches fetch failed
      if (isRejected(userResponse) || isRejected(startedMatchesResponse)) {
        throw new AppError("Base de dados inacessível", 204, ErrorCode.DB_ERROR);
      }

      const users = isFulfilled(userResponse) ? userResponse.value : [];
      const matches: IMatch[] = isFulfilled(startedMatchesResponse)
        ? this.mergeTeamsIntoMatches(startedMatchesResponse.value, teams)
        : [];
      const extras = isFulfilled(extrasResponse) ? extrasResponse.value : [];
      const extrasResults = isFulfilled(extrasResultsResponse) ? extrasResultsResponse.value : null;

      const startedMatches = matches.filter((match) => match.status !== 0);
      const matchIds: number[] = [];

      const weeklyRankingObj: {
        matchCount: number;
        matches: IMatch[];
        ranking: IRankingLine[];
        week: number;
      }[] = [];

      startedMatches.forEach((startedMatch) => {
        const week = startedMatch.week;
        const existingWeek = weeklyRankingObj.find((w) => w.week === week);
        const matchCount = matches.filter((match) => match.week === week).length;
        if (existingWeek) {
          existingWeek.matches.push(startedMatch);
        } else {
          weeklyRankingObj.push({ matchCount, matches: [startedMatch], ranking: [], week });
        }

        matchIds.push(startedMatch.id);
      });

      const bets = await this.betService.getStartedMatchesBetsByMatchIds(matchIds);

      // Calculate weekly rankings
      const weeklyRanking = weeklyRankingObj.map((weeklyMatches) => {
        const { matches, week } = weeklyMatches;
        const cacheKey = CACHE_KEYS.WEEKLY_RANKING.toString() + "_" + season + "_" + week.toString();
        const cachedRanking = cachedInfo.get<IRankingLine[]>(cacheKey);

        if (cachedRanking) {
          console.log("Returning cached ranking for week", week);
          return { isLocked: true, ranking: cachedRanking, week: weeklyMatches.week };
        }

        console.log("Calculating ranking for week", week);
        const weeklyMaximumPoints = calculateMaxPoints(parseInt(season), matches);
        const weeklyRanking = buildWeeklyUserRanking(users, matches, bets, weeklyMaximumPoints);
        const isLocked = isWeekLocked(matches) && matches.length === weeklyMatches.matchCount;

        if (isLocked) {
          console.log("Caching ranking for week", week);
          cachedInfo.set(cacheKey, weeklyRanking);
        }

        return {
          isLocked,
          ranking: weeklyRanking,
          week: weeklyMatches.week,
        };
      });

      const totalPossiblePoints: number = calculateMaxPoints(parseInt(season), startedMatches);

      const seasonRanking: IRankingLine[] = buildSeasonUserRanking(
        users,
        startedMatches,
        bets,
        extras,
        extrasResults,
        totalPossiblePoints,
      );

      return { seasonRanking, weeklyRanking };
    });
  };

  mergeTeamsIntoMatches = (matches: IMatch[], teams: ITeam[]) => {
    const mergedMatches: IMatch[] = matches.map((match) => {
      const homeTeam = teams.find((team) => team.id === match.idHomeTeam);
      const awayTeam = teams.find((team) => team.id === match.idAwayTeam);

      const mergedMatch: IMatch = {
        ...match,
        away: awayTeam ?? null,
        home: homeTeam ?? null,
      };

      return mergedMatch;
    });

    return mergedMatches;
  };
}

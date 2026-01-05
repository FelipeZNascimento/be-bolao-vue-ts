import type { IBet, IExtraBet } from "#bet/bet.types.js";
import type { IMatch } from "#match/match.types.js";
import type { IRankingLine, IWeeklyRanking } from "#ranking/ranking.types.js";
import type { ITeam } from "#team/team.types.js";
import type { IUser } from "#user/user.types.js";

import { BetService } from "#bet/bet.service.js";
import { MatchService } from "#match/match.service.js";
import {
  buildSeasonUserRanking,
  buildWeeklyUserRanking,
  calculateMaxPoints,
  isWeekLocked,
} from "#ranking/ranking.utils.js";
import { BaseController } from "#shared/base.controller.js";
import { TeamService } from "#team/team.service.js";
import { UserService } from "#user/user.service.js";
import { isFulfilled, isRejected } from "#utils/apiResponse.js";
import { AppError } from "#utils/appError.js";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.js";
import { ErrorCode } from "#utils/errorCodes.js";
import { NextFunction, Request, Response } from "express";

export class RankingController extends BaseController {
  constructor(
    private userService: UserService,
    private matchService: MatchService,
    private teamService: TeamService,
    private betService: BetService,
  ) {
    super();
  }

  calculateRanking = async (season: number, seasonStart: number) => {
    if (!season || !seasonStart) {
      throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
    }

    const { extras, extrasResults, matches, startedMatches, users } = await this.fetchRequiredData(season, seasonStart);

    const { bets, weeklyRankingObj } = await this.prepareAndFilterMatches(matches, startedMatches);
    const weeklyRanking = this.calculateWeeklyRanking(weeklyRankingObj, season, users, bets);
    const seasonRanking = this.calculateSeasonRanking(
      users,
      season,
      startedMatches,
      bets,
      extras,
      extrasResults ? extrasResults[0] : null,
    );

    return { seasonRanking, weeklyRanking };
  };

  calculateSeasonRanking = (
    users: IUser[],
    season: number,
    startedMatches: IMatch[],
    bets: IBet[],
    extras: IExtraBet[],
    extrasResults: IExtraBet | null,
  ) => {
    const totalPossiblePoints: number = calculateMaxPoints(season, startedMatches);
    return buildSeasonUserRanking(users, startedMatches, bets, extras, extrasResults, totalPossiblePoints);
  };

  calculateWeeklyRanking = (weeklyRankingObj: IWeeklyRanking[], season: number, users: IUser[], bets: IBet[]) => {
    const usersAccumulated = users.map((user) => ({ accumulatedPoints: 0, userId: user.id }));
    return weeklyRankingObj.map((weeklyMatches) => {
      const { matches, week } = weeklyMatches;
      const cacheKey = CACHE_KEYS.WEEKLY_RANKING.toString() + "_" + season.toString() + "_" + week.toString();
      const cachedRanking = cachedInfo.get<IRankingLine[]>(cacheKey);

      if (cachedRanking) {
        console.log("Returning cached ranking for ", cacheKey);
        return { isLocked: true, ranking: cachedRanking, week: weeklyMatches.week };
      }

      const weeklyMaximumPoints = calculateMaxPoints(season, matches);
      const weeklyRanking = buildWeeklyUserRanking(users, matches, bets, weeklyMaximumPoints);
      weeklyRanking.forEach((rankingLine) => {
        const userAccumulated = usersAccumulated.find((u) => u.userId === rankingLine.user.id);
        if (userAccumulated) {
          userAccumulated.accumulatedPoints += rankingLine.score.total;
          rankingLine.score.accumulatedPoints = userAccumulated.accumulatedPoints;
        }
      });
      const isLocked = isWeekLocked(matches) && matches.length === weeklyMatches.matchCount;

      if (isLocked) {
        console.log("Caching ranking for ", cacheKey);
        cachedInfo.set(cacheKey, weeklyRanking);
      }

      return {
        isLocked,
        ranking: weeklyRanking,
        week: weeklyMatches.week,
      };
    });
  };

  fetchRequiredData = async (season: number, seasonStart: number) => {
    let teams: ITeam[] = cachedInfo.get(CACHE_KEYS.TEAMS) ?? [];

    if (teams.length === 0) {
      teams = await this.teamService.getAll();
      cachedInfo.set(CACHE_KEYS.TEAMS, teams);
    }

    const [userResponse, startedMatchesResponse, extrasResponse, extrasResultsResponse] = await Promise.allSettled([
      this.userService.getBySeason(season),
      this.matchService.getMatchesBySeason(season),
      this.betService.getExtras(season, seasonStart),
      this.betService.getExtrasResults(season, seasonStart),
    ]);

    // Only throw if user or matches fetch failed
    if (isRejected(userResponse) || isRejected(startedMatchesResponse)) {
      throw new AppError("Base de dados inacessível", 204, ErrorCode.DB_ERROR);
    }

    const users = isFulfilled(userResponse) ? userResponse.value : [];
    const matches: IMatch[] = isFulfilled(startedMatchesResponse)
      ? this.mergeTeamsIntoMatches(startedMatchesResponse.value, teams)
      : [];
    const startedMatches = matches.filter((match) => match.status !== 0);
    const extras = isFulfilled(extrasResponse) ? extrasResponse.value : [];
    const extrasResults = isFulfilled(extrasResultsResponse) ? extrasResultsResponse.value : null;

    return { extras, extrasResults, matches, startedMatches, users };
  };

  getRanking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      const season = req.params.season || process.env.SEASON;
      const seasonStart = process.env.SEASON_START;

      if (!season || !seasonStart) {
        throw new AppError("Campo obrigatório ausente", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }

      return await this.calculateRanking(parseInt(season), parseInt(seasonStart));
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

  prepareAndFilterMatches = async (matches: IMatch[], startedMatches: IMatch[]) => {
    const matchIds: number[] = [];

    const weeklyRankingObj: {
      matchCount: number;
      matches: IMatch[];
      ranking: IRankingLine[];
      week: number;
    }[] = [];

    matches.forEach((matchObj) => {
      const week = matchObj.week;
      const existingWeek = weeklyRankingObj.find((w) => w.week === week);
      const matchCount = matches.filter((match) => match.week === week).length;
      if (existingWeek) {
        existingWeek.matches.push(matchObj);
      } else {
        weeklyRankingObj.push({ matchCount, matches: [matchObj], ranking: [], week });
      }

      matchIds.push(matchObj.id);
    });

    const bets = await this.betService.getStartedMatchesBetsByMatchIds(startedMatches.map((m) => m.id));

    return {
      bets,
      weeklyRankingObj,
    };
  };
}

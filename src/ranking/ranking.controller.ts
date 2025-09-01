import { BetService } from "#bet/bet.service.ts";
import { IMatch, MatchService } from "#match/match.service.ts";
import { RankingService } from "#ranking/ranking.service.ts";
import { BaseController } from "#shared/base.controller.ts";
import { ErrorCode } from "#shared/errorCodes.ts";
import { ErrorHandler } from "#shared/errorHandler.ts";
import { ITeam, TeamService } from "#team/team.service.ts";
import { UserService } from "#user/user.service.ts";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.ts";
import { NextFunction, Request, Response } from "express";

import { buildUsersObject } from "./ranking.utils.ts";

export class RankingController extends BaseController {
  constructor(
    private rankingService: RankingService,
    private userService: UserService,
    private matchService: MatchService,
    private teamService: TeamService,
    private betService: BetService,
  ) {
    super();
  }

  getSeason = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.handleRequest(req, res, next, async () => {
      let teams: ITeam[] | undefined = cachedInfo.get(CACHE_KEYS.TEAMS);
      const season = req.params.season || process.env.SEASON;
      const seasonStart = process.env.SEASON_START;

      if (!season || !seasonStart) {
        throw new ErrorHandler("Missing required field", 400, ErrorCode.MISSING_REQUIRED_FIELD);
      }
      if (!teams) {
        teams = await this.teamService.getAll();
        cachedInfo.set(CACHE_KEYS.TEAMS, teams);
      }

      // const [userResponse, matchResponse, startedMatchesResponse, extrasResponse, extrasResults] = await Promise.allSettled([
      const [userResponse, matchResponse, startedMatchesResponse] = await Promise.allSettled([
        this.userService.getBySeason(parseInt(season)),
        this.matchService.getBySeason(parseInt(season)),
        this.matchService.getStartedMatches(parseInt(season)),
        this.betService.getExtras(parseInt(season), parseInt(seasonStart)),
        this.betService.getExtrasResults(parseInt(season), parseInt(seasonStart)),
      ]);

      const isRejected = (input: PromiseSettledResult<unknown>): input is PromiseRejectedResult => input.status === "rejected";
      const isFulfilled = <T>(p: PromiseSettledResult<T>): p is PromiseFulfilledResult<T> => p.status === "fulfilled";

      if (isRejected(userResponse) || isRejected(matchResponse)) {
        throw new ErrorHandler("Database unreachable", 204, ErrorCode.DB_ERROR);
      }

      const users = isFulfilled(userResponse) ? userResponse.value : [];
      const matches = isFulfilled(matchResponse) ? this.mergeTeamsIntoMatches(matchResponse.value, teams) : [];
      const startedMatches = isFulfilled(startedMatchesResponse) ? startedMatchesResponse.value : [];

      const matchIds = matches.map((match) => match.id);

      const bets = await this.betService.getByMatchIds(matchIds, parseInt(season));

      const usersObject = buildUsersObject(users, matches, bets, true);

      return { matches, startedMatches, users, usersObject };
    });
  };

  mergeTeamsIntoMatches = (matches: IMatch[], teams: ITeam[]) => {
    return matches.map((match) => {
      const homeTeam = teams.find((team) => team.id === match.idHomeTeam);
      const awayTeam = teams.find((team) => team.id === match.idAwayTeam);

      return {
        ...match,
        away: awayTeam ?? null,
        home: homeTeam ?? null,
      };
    });
  };
}

import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.ts";

import { TeamService } from "./team.service.ts";
import { type ITeam } from "./team.types.ts";
/**
 * getFromCacheOrFetch - Returns all teams from cache or fetches from database if not present in cache.
 *
 * @teamService: Instantiated TeamService to fetch team data.
 *
 * @return: All teams.
 */
export const getFromCacheOrFetch = async (teamService: TeamService): Promise<ITeam[]> => {
  const cachedTeams: ITeam[] | undefined = cachedInfo.get(CACHE_KEYS.TEAMS);

  if (cachedTeams) {
    return cachedTeams;
  }

  const teams = await teamService.getAll();
  setTeamsCache(teams);
  return [...teams];
};

export const setTeamsCache = (teams: ITeam[]): void => {
  cachedInfo.set(CACHE_KEYS.TEAMS, teams, 60 * 60 * 24 * 14); // Cache for 14 days
};

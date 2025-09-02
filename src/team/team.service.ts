import db from "#database/db.ts";
import { CACHE_KEYS, cachedInfo } from "#utils/dataCache.ts";

export interface ITeam {
  alias: string;
  background: string;
  code: string;
  conference: string;
  division: string;
  foreground: string;
  id: number;
  name: string;
}

export class TeamService {
  async getAll() {
    const cachedTeams: ITeam[] = cachedInfo.get(CACHE_KEYS.TEAMS) ?? [];

    if (cachedTeams.length > 0) {
      return cachedTeams;
    }

    const rows: ITeam[] = (await db.query(`SELECT SQL_NO_CACHE * FROM teams`, [])) as ITeam[];
    cachedInfo.set(CACHE_KEYS.TEAMS, rows);
    return rows;
  }
}

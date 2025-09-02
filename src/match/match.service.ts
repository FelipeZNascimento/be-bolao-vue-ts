import db from "#database/db.ts";
import { ITeam } from "#team/team.service.ts";
import { RowDataPacket } from "mysql2/promise";

export interface IMatch extends RowDataPacket {
  away: ITeam | null;
  awayScore: number;
  clock: string;
  home: ITeam | null;
  homeTeamOdds: string;
  homeyScore: number;
  id: number;
  idAwayTeam: number;
  idHomeTeam: number;
  overUnder: string;
  possession: number;
  season: number;
  status: number;
  timestamp: number;
  week: number;
}

// interface ICount extends RowDataPacket {
//   count: number;
// }

interface IWeek extends RowDataPacket {
  week: number;
}

export class MatchService {
  async getBySeason(season: number) {
    return (await db.query(
      `SELECT SQL_NO_CACHE matches.id, matches.timestamp, matches.week, matches.id_season as season, matches.status, matches.possession,
        matches.away_points as awayScore, matches.home_points as homeScore, matches.clock, matches.overUnder, matches.homeTeamOdds,
        matches.id_home_team as idHomeTeam, matches.id_away_team as idAwayTeam
        FROM matches
        WHERE matches.id_season = ?
        ORDER BY matches.timestamp ASC`,
      [season],
    )) as IMatch[];
  }

  async getBySeasonWeek(season: number, week: number) {
    return await db.query(
      `SELECT SQL_NO_CACHE matches.id, matches.timestamp, matches.week, matches.id_season as season, matches.status, matches.possession,
        matches.away_points as awayScore, matches.home_points as homeScore, matches.clock, matches.overUnder, matches.homeTeamOdds,
        teamHome.name AS teamHome, teamHome.alias AS teamHomeAlias, teamHome.id AS idTeamHome,
        teamHome.code AS teamHomeCode, teamHome.background AS teamHomeBackground, teamHome.foreground AS teamHomeForeground,
        teamAway.name AS teamAway, teamAway.alias AS teamAwayAlias, teamAway.id AS idTeamAway,
        teamAway.code AS teamAwayCode, teamAway.background AS teamAwayBackground, teamAway.foreground AS teamAwayForeground
        FROM matches
        INNER JOIN teams as teamHome 		ON matches.id_home_team = teamHome.id
        INNER JOIN teams as teamAway 		ON matches.id_away_team = teamAway.id
        WHERE matches.id_season = ?
        AND matches.week = ?
        ORDER BY matches.timestamp ASC`,
      [season, week],
    );
  }

  async getCurrentWeek() {
    const [row] = (await db.query(
      `SELECT week
        FROM matches
        WHERE matches.timestamp > UNIX_TIMESTAMP() - 24 * 3600
        ORDER BY timestamp ASC
        LIMIT 1`,
      [],
    )) as IWeek[];

    return row.week;
  }

  async getStartedMatchesBySeason(season: number) {
    return (await db.query(
      `SELECT SQL_NO_CACHE matches.id, matches.timestamp, matches.week, matches.id_season as season, matches.status, matches.possession,
        matches.away_points as awayScore, matches.home_points as homeScore, matches.clock, matches.overUnder, matches.homeTeamOdds,
        matches.id_home_team as idHomeTeam, matches.id_away_team as idAwayTeam
        FROM matches
        WHERE matches.id_season = ?
        AND matches.status != 0
        ORDER BY matches.timestamp ASC`,
      [season],
    )) as IMatch[];
  }

  // async getStartedMatchesCount(season: number) {
  //   const [row] = (await db.query(
  //     `SELECT COUNT(*) as count
  //       FROM matches
  //       WHERE matches.status != 0
  //       AND id_season = ?`,
  //     [season],
  //   )) as ICount[];

  //   return row.count;
  // }
}

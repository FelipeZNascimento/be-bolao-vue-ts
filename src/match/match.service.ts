import type { IMatch, IWeek } from "#match/match.types.js";
import type { ICount } from "#shared/shared.types.js";

import db from "#database/db.js";
import { MatchStatus } from "#match/match.constants.js";
import { ResultSetHeader } from "mysql2/promise";

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
    return (await db.query(
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
    )) as IMatch[];
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

  async getMatchesBySeason(season: number) {
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

  async getTimestampByMatchId(matchId: number) {
    const [row] = (await db.query(
      `SELECT SQL_NO_CACHE matches.id, matches.timestamp
        FROM matches
        WHERE matches.id = ?`,
      [matchId],
    )) as { id: number; timestamp: number }[];

    return row as undefined | { id: number; timestamp: number };
  }

  async getWeekMatchesCount(season: number, week: number) {
    const [row] = (await db.query(
      `SELECT COUNT(*) as count
        FROM matches
        WHERE id_season = ?
        AND week = ?`,
      [season, week],
    )) as ICount[];

    return row.count;
  }

  async updateByMatchInfo(
    awayPoints: number,
    homePoints: number,
    matchStatus: MatchStatus,
    possession: "away" | "home" | null,
    clock: null | string,
    awayTeamCode: string,
    homeTeamCode: string,
    week: number,
    season: number,
  ) {
    return (await db.query(
      `UPDATE matches
        SET away_points = ?,
        home_points = ?,
        status = ?,
        possession = ?,
        clock = ?
        WHERE id_away_team = (
            SELECT id 
            FROM teams
            WHERE code = ?
        )
        AND id_home_team = (
            SELECT id 
            FROM teams
            WHERE code = ?
        )
        AND week = ?
        AND id_season = ?`,
      [awayPoints, homePoints, matchStatus, possession, clock, awayTeamCode, homeTeamCode, week, season],
    )) as ResultSetHeader;
  }

  async updateOddsByMatchInfo(
    overUnder: string,
    homeTeamOdds: string,
    awayTeamCode: string,
    homeTeamCode: string,
    week: number,
    matchStatus: MatchStatus,
    season: number,
  ) {
    return (await db.query(
      `UPDATE matches
        SET overUnder = ?,
        homeTeamOdds = ?
        WHERE id_away_team = (
            SELECT id 
            FROM teams
            WHERE code = ?
        )
        AND id_home_team = (
            SELECT id 
            FROM teams
            WHERE code = ?
        )
        AND week = ?
        AND id_season = ?
        AND status = ?`,
      [overUnder, homeTeamOdds, awayTeamCode, homeTeamCode, week, season, matchStatus],
    )) as ResultSetHeader;
  }
}

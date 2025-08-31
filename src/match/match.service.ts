import db from "#database/db.ts";

export class MatchService {
  async getBySeasonWeek(season: number, week: number) {
    const rows = await db.query(
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

    return rows;
  }

  async getNextMatchWeek() {
    const rows = await db.query(
      `SELECT week
        FROM matches
        WHERE matches.timestamp > UNIX_TIMESTAMP() - 24 * 3600
        ORDER BY timestamp ASC
        LIMIT 1`,
      [],
    );

    return rows;
  }
}

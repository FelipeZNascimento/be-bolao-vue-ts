import db from '#database/db.js';
import { AppError } from '#utils/appError.js';
import { ErrorCode } from '#utils/errorCodes.js';
import { ResultSetHeader } from 'mysql2/promise';

const FLEAFLICKER_BASE_URL = 'https://www.fleaflicker.com/api';

export class FleaflickerService {
  constructor() {}

  async getBoxscore(leagueId: string, scoringPeriod?: string) {
    const scoringPeriodParam = scoringPeriod ? `&scoring_period=${encodeURIComponent(scoringPeriod)}` : '';
    const response = await fetch(
      `${FLEAFLICKER_BASE_URL}/FetchLeagueScoreboard?leagueId=${encodeURIComponent(leagueId)}${scoringPeriodParam}`
    );

    if (!response.ok) {
      throw new AppError('Erro ao buscar dados do Fleaflicker', 502, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return (await response.json()) as unknown;
  }

  async getStandings(leagueId: string) {
    const response = await fetch(
      `${FLEAFLICKER_BASE_URL}/FetchLeagueStandings?leagueId=${encodeURIComponent(leagueId)}`
    );

    if (!response.ok) {
      throw new AppError('Erro ao buscar dados do Fleaflicker', 502, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return (await response.json()) as unknown;
  }

  async getRoster(leagueId: string, teamId: string) {
    const response = await fetch(
      `${FLEAFLICKER_BASE_URL}/FetchRoster?leagueId=${encodeURIComponent(leagueId)}&team_id=${encodeURIComponent(teamId)}`
    );

    if (!response.ok) {
      throw new AppError('Erro ao buscar dados do Fleaflicker', 502, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return (await response.json()) as unknown;
  }

  async setFleaflickerInfo(userId: number, leagueId: number, teamId: number) {
    const rows = (await db.query(
      `INSERT INTO fleaflicker (user_id, league_id, team_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE league_id = VALUES(league_id), team_id = VALUES(team_id)`,
      [userId, leagueId, teamId]
    )) as ResultSetHeader;

    return rows;
  }

  async deleteFleaflickerInfo(userId: number) {
    const rows = (await db.query(`DELETE FROM fleaflicker WHERE user_id = ?`, [userId])) as ResultSetHeader;

    return rows;
  }
}

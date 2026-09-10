import db from '#database/db.js';
import type { IFleaflickerBoxscore, IFleaflickerScoreboard } from '#fleaflicker/fleaflicker.types.js';
import { AppError } from '#utils/appError.js';
import { ErrorCode } from '#utils/errorCodes.js';
import { ResultSetHeader } from 'mysql2/promise';

const FLEAFLICKER_BASE_URL = 'https://www.fleaflicker.com/api';

export class FleaflickerService {
  constructor() {}

  async getLeagueScoreboard(leagueId: string, scoringPeriod?: string): Promise<IFleaflickerScoreboard> {
    const scoringPeriodParam = scoringPeriod ? `&scoring_period=${encodeURIComponent(scoringPeriod)}` : '';
    const response = await fetch(
      `${FLEAFLICKER_BASE_URL}/FetchLeagueScoreboard?leagueId=${encodeURIComponent(leagueId)}${scoringPeriodParam}`
    );

    if (!response.ok) {
      throw new AppError('Erro ao buscar dados do Fleaflicker', 502, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return (await response.json()) as IFleaflickerScoreboard;
  }

  async getLeagueBoxscore(leagueId: string, gameId: string): Promise<IFleaflickerBoxscore> {
    const response = await fetch(
      `${FLEAFLICKER_BASE_URL}/FetchLeagueBoxscore?league_id=${encodeURIComponent(leagueId)}&fantasy_game_id=${encodeURIComponent(gameId)}`
    );

    if (!response.ok) {
      throw new AppError('Erro ao buscar dados do Fleaflicker', 502, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return (await response.json()) as IFleaflickerBoxscore;
  }

  async getStandings(leagueId: string): Promise<unknown> {
    const response = await fetch(
      `${FLEAFLICKER_BASE_URL}/FetchLeagueStandings?leagueId=${encodeURIComponent(leagueId)}`
    );

    if (!response.ok) {
      throw new AppError('Erro ao buscar dados do Fleaflicker', 502, ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return (await response.json()) as unknown;
  }

  async getRoster(leagueId: string, teamId: string): Promise<unknown> {
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

import db from "#database/db.ts";
import { ResultSetHeader } from "mysql2/promise";

import { IBet, IExtraBet } from "./bet.types.ts";

export class BetService {
  async getExtras(season: number, seasonStart: number) {
    const rows = (await db.query(
      `SELECT SQL_NO_CACHE extra_bets_new.id_user as idUser, extra_bets_new.id_season as idSeason, extra_bets_new.json,
        users.name as userName, users_icon.icon as userIcon, users_icon.color as userColor
        FROM extra_bets_new
        INNER JOIN users 		ON users.id = extra_bets_new.id_user
        LEFT JOIN users_icon    ON users.id = users_icon.id_user
        WHERE id_season = ?
        AND UNIX_TIMESTAMP() >= ?`,
      [season, seasonStart],
    )) as IExtraBet[];

    return rows;
  }

  async getExtrasResults(season: number, seasonStart: number) {
    console.log(seasonStart, season);
    const [row] = (await db.query(
      `SELECT SQL_NO_CACHE id_season as idSeason, json
        FROM extra_bets_results_new
        WHERE id_season = ?
        AND UNIX_TIMESTAMP() >= ?`,
      [season, seasonStart],
    )) as IExtraBet[];

    return row;
  }

  async getStartedMatchesBetsByMatchIds(matchIds: number[]) {
    if (matchIds.length === 0) {
      return [];
    }

    const rows = await db.query(
      `SELECT bets.id, bets.id_bet as betValue, bets.id_user as userId, bets.id_match as matchId,
        users.name as userName, users_icon.icon as userIcon, users_icon.color as userColor
        FROM bets
        INNER JOIN matches 		ON matches.id = bets.id_match
        INNER JOIN users 		ON users.id = bets.id_user
        LEFT JOIN users_icon    ON users.id = users_icon.id_user
        WHERE matches.timestamp <= UNIX_TIMESTAMP()
        AND bets.id_match IN (?)
        GROUP BY bets.id_match, bets.id_user`,
      [matchIds],
    );

    return rows as IBet[];
  }

  async getUserMatchesBetsByMatchIds(matchIds: number[], userId: number) {
    if (matchIds.length === 0) {
      return [];
    }

    const rows = await db.query(
      `SELECT bets.id, bets.id_bet as betValue, bets.id_user as userId, bets.id_match as matchId,
        users.name as userName, users_icon.icon as userIcon, users_icon.color as userColor
        FROM bets
        INNER JOIN matches 		ON matches.id = bets.id_match
        INNER JOIN users 		ON users.id = bets.id_user
        LEFT JOIN users_icon    ON users.id = users_icon.id_user
        WHERE bets.id_user = ?
        AND bets.id_match IN (?)
        GROUP BY bets.id_match, bets.id_user`,
      [userId, matchIds],
    );

    return rows as IBet[];
  }

  async update(betValue: number, matchId: number, userId: number) {
    return (await db.query(
      `INSERT INTO bets (id_match, id_user, id_bet) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE id_bet = ?`,
      [matchId, userId, betValue, betValue],
    )) as ResultSetHeader;
  }

  async updateExtras(extras: string, userId: number, season: string) {
    return (await db.query(
      `INSERT INTO extra_bets_new (id_user, id_season, json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE json = ?`,
      [userId, season, extras, extras],
    )) as ResultSetHeader;
  }
}

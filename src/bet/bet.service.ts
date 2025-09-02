import db from "#database/db.ts";
import { IUser } from "#user/user.service.ts";

export interface IBet {
  betValue: number;
  id: number;
  matchId: number;
  user: Omit<IUser, "timestamp, fullname, seasonId, email">[];
  userColor: string;
  userIcon: string;
  userId: number;
  userName: string;
}

export interface IExtraBet {
  idSeason: number;
  idUser: number;
  json: string;
  userColor: string;
  userIcon: string;
  userName: string;
}

export class BetService {
  async getByMatchIds(matchIds: number[], season: number) {
    const rows = await db.query(
      `SELECT bets.id, bets.id_bet as betValue, bets.id_user as userId, bets.id_match as matchId,
        users.name as userName, users_icon.icon as userIcon, users_icon.color as userColor
        FROM bets
        INNER JOIN matches 		ON matches.id = bets.id_match
        INNER JOIN users 		ON users.id = bets.id_user
        LEFT JOIN users_icon    ON users.id = users_icon.id_user
        WHERE matches.timestamp <= UNIX_TIMESTAMP()
        AND matches.id_season = ?
        AND bets.id_match IN (?)
        GROUP BY bets.id_match, bets.id_user`,
      [season, matchIds],
    );

    return rows as IBet[];
  }
  async getExtras(season: number, seasonStart: number) {
    const rows = await db.query(
      `SELECT SQL_NO_CACHE extra_bets_new.id_user as idUser, extra_bets_new.id_season as idSeason, extra_bets_new.json,
        users.name as userName, users_icon.icon as userIcon, users_icon.color as userColor
        FROM extra_bets_new
        INNER JOIN users 		ON users.id = extra_bets_new.id_user
        LEFT JOIN users_icon    ON users.id = users_icon.id_user
        WHERE id_season = ?
        AND UNIX_TIMESTAMP() >= ?`,
      [season, seasonStart],
    );

    return rows as IExtraBet[];
  }

  async getExtrasResults(season: number, seasonStart: number) {
    const [row] = (await db.query(
      `SELECT SQL_NO_CACHE id_season as idSeason, json
        FROM extra_bets_results_new
        WHERE id_season = ?
        AND UNIX_TIMESTAMP() >= ?`,
      [season, seasonStart],
    )) as IExtraBet[];

    return row;

    // return (await db.query(
    //   `SELECT SQL_NO_CACHE id_season as idSeason, json
    //     FROM extra_bets_results_new
    //     WHERE id_season = ?
    //     AND UNIX_TIMESTAMP() >= ?`,
    //   [season, seasonStart],
    // )) as IExtraBet[];
  }
}

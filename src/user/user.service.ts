import db from "#database/db.ts";

export interface IUser {
  color: string;
  email: string;
  fullName: string;
  icon: string;
  id: number;
  isOnline: boolean;
  name: string;
  position: number;
  seasonId: number;
  timestamp: number;
}

export class UserService {
  async getBySeason(season: number) {
    const rows = (await db.query(
      `SELECT SQL_NO_CACHE users.id, users.login as email, users.name, users.full_name as fullName,
        users_icon.icon, users_icon.color, unix_timestamp(users_online.timestamp) as timestamp,
        users_season.id AS seasonId
        FROM users
        INNER JOIN users_season ON users.id = users_season.id_user AND users_season.id_season = ?
        LEFT JOIN users_icon ON users.id = users_icon.id_user
        LEFT JOIN users_online ON users.id = users_online.id_user`,
      [season],
    )) as IUser[];

    return rows;
  }

  async updateLastOnlineTime(id: number) {
    const rows = await db.query(`INSERT INTO users_online (id_user) VALUES (?) ON DUPLICATE KEY UPDATE timestamp = NOW()`, [id]);

    return rows;
  }
}

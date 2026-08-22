import type { IUser } from '#user/user.types.js';

import db from '#database/db.js';
import { ICount } from '#shared/shared.types.js';
import bcrypt from 'bcrypt';
import { ResultSetHeader } from 'mysql2/promise';

const BCRYPT_SALT_ROUNDS = 12;

export class UserService {
  async getByEmail(email: string) {
    const [row] = (await db.query(
      `SELECT users.id, users.login as email, users.name, users.full_name as fullName,
        users_icon.icon, users_icon.color, unix_timestamp(users_online.timestamp) as timestamp, users.admin,
        users_season.id_season as seasonId, users_season.active
        FROM users
        INNER JOIN users_season ON users.id = users_season.id_user
        LEFT JOIN users_icon ON users.id = users_icon.id_user
        LEFT JOIN users_online ON users.id = users_online.id_user
        WHERE users.login = ?
        ORDER BY seasonId DESC
        LIMIT 1`,
      [email]
    )) as IUser[];

    return row;
  }

  async getById(userId: number) {
    const [row] = (await db.query(
      `SELECT users.id, users.login as email, users.name, users.full_name as fullName,
        users_icon.icon, users_icon.color, unix_timestamp(users_online.timestamp) as timestamp, users.admin,
        users_season.id_season as seasonId, users_season.active, users_season.active
        FROM users
        INNER JOIN users_season ON users.id = users_season.id_user
        LEFT JOIN users_icon ON users.id = users_icon.id_user
        LEFT JOIN users_online ON users.id = users_online.id_user
        WHERE users.id = ?
        ORDER BY seasonId DESC
        LIMIT 1`,
      [userId]
    )) as IUser[];

    return row;
  }

  async getAdmin(season: number) {
    const rows = (await db.query(
      `SELECT SQL_NO_CACHE users.id, users.login as email, users.name, users.admin, users.full_name as fullName,
        users_icon.icon, users_icon.color, unix_timestamp(users_online.timestamp) as timestamp,
        users_season.id_season AS seasonId, users_season.active
        FROM users
        INNER JOIN users_season ON users.id = users_season.id_user
        AND users_season.id_season = ?
        LEFT JOIN users_icon ON users.id = users_icon.id_user
        LEFT JOIN users_online ON users.id = users_online.id_user`,
      [season]
    )) as IUser[];

    const extraBetsCounts = await this.getExtraBetsCounts(season);

    return rows.map((row) => ({ ...row, extraBetsCount: extraBetsCounts.get(row.id) ?? 0 }));
  }

  async getExtraBetsCounts(season: number) {
    const rows = (await db.query(`SELECT SQL_NO_CACHE id_user, json FROM extra_bets_new WHERE id_season = ?`, [
      season
    ])) as { id_user: number; json: string }[];

    const counts = new Map<number, number>();

    for (const row of rows) {
      const parsed = JSON.parse(row.json) as Record<string, unknown>;
      const count = Object.values(parsed).reduce((total: number, value) => {
        if (value === null) {
          return total;
        }
        return total + (Array.isArray(value) ? value.length : 1);
      }, 0);
      counts.set(row.id_user, (counts.get(row.id_user) ?? 0) + count);
    }

    return counts;
  }

  async getBySeason(season: number) {
    const rows = (await db.query(
      `SELECT SQL_NO_CACHE users.id, users.login as email, users.name, users.full_name as fullName,
        users_icon.icon, users_icon.color, unix_timestamp(users_online.timestamp) as timestamp,
        users_season.id_season AS seasonId, users_season.active
        FROM users
        INNER JOIN users_season ON users.id = users_season.id_user
        AND users_season.id_season = ? AND users_season.active = 1
        LEFT JOIN users_icon ON users.id = users_icon.id_user
        LEFT JOIN users_online ON users.id = users_online.id_user`,
      [season]
    )) as IUser[];

    return rows;
  }

  async getFavorites(id: number) {
    const [row] = (await db.query(`SELECT SQL_NO_CACHE favorites FROM favorites WHERE user_id = ?`, [id])) as {
      favorites: string;
    }[];

    if (!row?.favorites) {
      return [];
    }

    return JSON.parse(row.favorites) as string[];
  }

  async isEmailValid(email: string, userId?: number) {
    const [rows] = (await db.query(`SELECT SQL_NO_CACHE COUNT(*) as count FROM users WHERE login = ? AND id <> ?`, [
      email,
      userId
    ])) as ICount[];

    return rows.count === 0;
  }

  async isUsernameValid(name: string, userId?: number) {
    const [rows] = (await db.query(`SELECT COUNT(*) as count FROM users WHERE name = ? AND id <> ?`, [
      name,
      userId
    ])) as ICount[];

    return rows.count === 0;
  }

  async login(email: string) {
    const rows = (await db.query(
      `SELECT users.id, users.login as email, users.name, users.full_name as fullName,
        users_icon.icon, users_icon.color, users.password, users.admin,
        users_season.id_season as seasonId, users_season.active
        FROM users
        JOIN users_season ON users.id = users_season.id_user
        JOIN users_icon ON users.id = users_icon.id_user
        WHERE users.login = ?
        ORDER BY users_season.id_season DESC
        LIMIT 1`,
      [email]
    )) as (IUser & { password: string })[];

    return rows;
  }

  async register(email: string, fullName: string, name: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const rows = (await db.query(`INSERT INTO users (login, password, full_name, name) VALUES (?, ?, ?, ?)`, [
      email,
      hashedPassword,
      fullName,
      name
    ])) as ResultSetHeader;

    return rows;
  }

  async registerToCurrentSeason(id: number, season: string) {
    const rows = (await db.query(`INSERT INTO users_season (id_user, id_season) VALUES (?, ?)`, [
      id,
      season
    ])) as ResultSetHeader;

    return rows;
  }

  async setIcons(id: number, color: string, icon: string) {
    const rows = (await db.query(
      `INSERT INTO users_icon (id_user, icon, color) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE icon = ?, color = ?`,
      [id, icon, color, icon, color]
    )) as ResultSetHeader;

    return rows;
  }

  async setOnCurrentSeason(season: number, id: number) {
    const rows = (await db.query(`INSERT INTO users_season (id_user, id_season) VALUES (?, ?)`, [
      id,
      season
    ])) as ResultSetHeader;

    return rows;
  }

  async updateFavorites(id: number, favorites: string[]) {
    const serializedFavorites = JSON.stringify(favorites);
    const rows = (await db.query(
      `INSERT INTO favorites (user_id, favorites) VALUES (?, ?) ON DUPLICATE KEY UPDATE favorites = ?`,
      [id, serializedFavorites, serializedFavorites]
    )) as ResultSetHeader;

    return rows;
  }

  async updateLastOnlineTime(id: number) {
    if (id === 0) {
      return;
    }

    const rows = (await db.query(
      `INSERT INTO users_online (id_user) VALUES (?) ON DUPLICATE KEY UPDATE timestamp = NOW()`,
      [id]
    )) as ResultSetHeader;

    return rows;
  }

  async updatePassword(currentPassword: string, newPassword: string, id: number): Promise<ResultSetHeader | null> {
    const [row] = (await db.query(`SELECT SQL_NO_CACHE password FROM users WHERE id = ?`, [id])) as {
      password: string;
    }[];

    if (!row) {
      return null;
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, row.password);
    if (!isCurrentPasswordValid) {
      return null;
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    const rows = (await db.query(
      `UPDATE users
        SET password = ?
        WHERE id = ?`,
      [hashedPassword, id]
    )) as ResultSetHeader;

    return rows;
  }

  async updateUserActiveStatus(userId: string, season: number, newActiveStatus: boolean) {
    const rows = (await db.query(
      `UPDATE users_season
        SET active = ?
        WHERE id_user = ? AND id_season = ?`,
      [newActiveStatus, userId, season]
    )) as ResultSetHeader;

    return rows;
  }

  async updatePasswordFromToken(newPassword: string, id: number) {
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    const rows = (await db.query(
      `UPDATE users
        SET password = ?
        WHERE id = ?`,
      [hashedPassword, id]
    )) as ResultSetHeader;

    return rows;
  }

  async updateProfile(email: string, name: string, username: string, id: number) {
    const rows = (await db.query(
      `UPDATE users 
        SET name = ?,
        full_name = ?, 
        login = ?
        WHERE id = ?`,
      [username, name, email, id]
    )) as ResultSetHeader;

    return rows;
  }
}

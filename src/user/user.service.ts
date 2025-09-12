import db from "#database/db.ts";
import { ICount } from "#shared/shared.types.ts";
import { ResultSetHeader } from "mysql2/promise";

import { IUser } from "./user.types.ts";

export class UserService {
  async getById(userId: number) {
    const [row] = (await db.query(
      `SELECT SQL_NO_CACHE users.id, users.login as email, users.name, users.full_name as fullName,
        users_icon.icon, users_icon.color, unix_timestamp(users_online.timestamp) as timestamp,
        users_season.id AS seasonId
        FROM users
        INNER JOIN users_season ON users.id = users_season.id_user
        LEFT JOIN users_icon ON users.id = users_icon.id_user
        LEFT JOIN users_online ON users.id = users_online.id_user
        WHERE users.id = ?
        GROUP BY users.id`,
      [userId],
    )) as IUser[];

    return row;
  }

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

  async isEmailValid(email: string, userId?: number) {
    const [rows] = (await db.query(`SELECT SQL_NO_CACHE COUNT(*) as count FROM users WHERE login = ? AND id <> ?`, [
      email,
      userId,
    ])) as ICount[];

    return rows.count === 0;
  }

  async isUsernameValid(name: string, userId?: number) {
    const [rows] = (await db.query(`SELECT SQL_NO_CACHE COUNT(*) as count FROM users WHERE name = ? AND id <> ?`, [
      name,
      userId,
    ])) as ICount[];

    return rows.count === 0;
  }

  async login(email: string, password: string) {
    const rows = (await db.query(
      `SELECT SQL_NO_CACHE users.id, users.login as email, users.name, users.full_name as fullName,
        users_icon.icon, users_icon.color, users.status
        FROM users
        JOIN users_season ON users.id = users_season.id_user 
        JOIN users_icon ON users.id = users_icon.id_user
        WHERE users.login = ?
        AND users.password = ?
        GROUP BY users.id`,
      [email, password],
    )) as IUser[];

    return rows;
  }

  async register(email: string, fullName: string, name: string, password: string) {
    const rows = (await db.query(`INSERT INTO users (login, password, full_name, name) VALUES (?, ?, ?, ?)`, [
      email,
      password,
      fullName,
      name,
    ])) as ResultSetHeader;

    return rows;
  }

  async setIcons(id: number, color: string, icon: string) {
    const rows = (await db.query(
      `INSERT INTO users_icon (id_user, icon, color) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE icon = ?, color = ?`,
      [id, icon, color, icon, color],
    )) as ResultSetHeader;

    return rows;
  }

  async setOnCurrentSeason(season: number, id: number) {
    const rows = (await db.query(`INSERT INTO users_season (id_user, id_season) VALUES (?, ?)`, [
      id,
      season,
    ])) as ResultSetHeader;

    return rows;
  }

  async updateLastOnlineTime(id: number) {
    if (id === 0) {
      return;
    }

    const rows = (await db.query(
      `INSERT INTO users_online (id_user) VALUES (?) ON DUPLICATE KEY UPDATE timestamp = NOW()`,
      [id],
    )) as ResultSetHeader;

    return rows;
  }

  async updatePassword(newPassword: string, currentPassword: string, id: number) {
    const rows = (await db.query(
      `UPDATE users 
        SET password = ?
        WHERE id = ?
        AND password = ?`,
      [newPassword, id, currentPassword],
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
      [username, name, email, id],
    )) as ResultSetHeader;

    return rows;
  }
}

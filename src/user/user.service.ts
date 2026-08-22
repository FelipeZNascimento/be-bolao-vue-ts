import type { ISeasonRankingRow, IUserRecords, IUserSeasonPoints, IUserWeekRecord } from '#user/user.types.js';
import type { IUser } from '#user/user.types.js';

import { BetService } from '#bet/bet.service.js';
import { maxPointsPerBet } from '#bet/bet.utils.js';
import db from '#database/db.js';
import { MatchService } from '#match/match.service.js';
import { calculateMaxPoints, calculateUserPoints, isWeekLocked } from '#ranking/ranking.utils.js';
import { getSeasonLabel } from '#season/season.utils.js';
import { ICount } from '#shared/shared.types.js';
import bcrypt from 'bcrypt';
import { ResultSetHeader } from 'mysql2/promise';

const BCRYPT_SALT_ROUNDS = 12;

export class UserService {
  constructor(
    private betService: BetService = new BetService(),
    private matchService: MatchService = new MatchService()
  ) {}

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

  /**
   * Reads a user's final ranking for a given season from the `seasons_ranking` cache table
   * (populated by `scripts/populateSeasonRanking.ts` once a season is fully completed).
   * Returns null if the season hasn't been cached yet, so callers can fall back to a live
   * calculation.
   */
  async getCachedSeasonRanking(season: number, userId: number) {
    const [row] = (await db.query(
      `SELECT SQL_NO_CACHE percentage, points, bullseye, winner, total_bets as totalBets,
        total_games as totalGames, position, total_participants as totalParticipants,
        extras, total_possible_points as totalPossiblePoints, total_possible_extras as totalPossibleExtras
        FROM seasons_ranking
        WHERE id_season = ? AND id_user = ?`,
      [season, userId]
    )) as {
      percentage: string;
      points: number;
      bullseye: number;
      winner: number;
      totalBets: number;
      totalGames: number;
      position: number;
      totalParticipants: number;
      extras: number;
      totalPossiblePoints: number;
      totalPossibleExtras: number | null;
    }[];

    if (!row) {
      return null;
    }

    return { ...row, percentage: parseFloat(row.percentage) };
  }

  /**
   * Reads every row from the `seasons_ranking` cache table (populated by
   * `scripts/populateSeasonRanking.ts`), used to build the cross-season/cross-user records page.
   * Each of the three views is sorted by percentage (descending); percentage is stored as a
   * varchar in the database, so it's converted to a number before sorting.
   */
  async getSeasonsRanking() {
    const rows = (await db.query(
      `SELECT SQL_NO_CACHE seasons_ranking.id_season as season, seasons_ranking.id_user as userId,
        seasons_ranking.percentage, seasons_ranking.points, seasons_ranking.bullseye, seasons_ranking.winner,
        seasons_ranking.total_bets as totalBets, seasons_ranking.total_games as totalGames,
        seasons_ranking.position, seasons_ranking.total_participants as totalParticipants,
        seasons_ranking.extras, seasons_ranking.total_possible_points as totalPossiblePoints,
        seasons_ranking.total_possible_extras as totalPossibleExtras,
        users.name, users_icon.icon, users_icon.color
        FROM seasons_ranking
        INNER JOIN users ON users.id = seasons_ranking.id_user
        LEFT JOIN users_icon ON users_icon.id_user = seasons_ranking.id_user`,
      []
    )) as (Omit<ISeasonRankingRow, 'season' | 'user'> & {
      color: string;
      icon: string;
      name: string;
      season: number;
      userId: number;
    })[];

    const sortedRows = rows
      .map(({ color, icon, name, season, userId, ...row }) => ({
        ...row,
        season: { id: season, label: getSeasonLabel(season) },
        user: { color, icon, id: userId, name }
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

    const bySeason = new Map<number, ISeasonRankingRow[]>();
    const byUser = new Map<number, ISeasonRankingRow[]>();

    for (const row of sortedRows) {
      const seasonRows = bySeason.get(row.season.id) ?? [];
      seasonRows.push(row);
      bySeason.set(row.season.id, seasonRows);

      const userRows = byUser.get(row.user.id) ?? [];
      userRows.push(row);
      byUser.set(row.user.id, userRows);
    }

    return {
      all: sortedRows,
      bySeason: Object.fromEntries(bySeason),
      byUser: Object.fromEntries(byUser)
    };
  }

  async getUserRecords(userId: number): Promise<IUserRecords> {
    const seasons = await this.getUserSeasons(userId);

    // Fetch all seasons' matches and any cached season_ranking rows in parallel, then discard
    // seasons with no matches or not yet fully completed
    const [seasonsMatches, cachedRankings] = await Promise.all([
      Promise.all(seasons.map((season) => this.matchService.getBySeason(season))),
      Promise.all(seasons.map((season) => this.getCachedSeasonRanking(season, userId)))
    ]);
    const validSeasons = seasons
      .map((season, index) => ({ cachedRanking: cachedRankings[index], matches: seasonsMatches[index], season }))
      .filter(({ matches }) => matches.length > 0 && isWeekLocked(matches));

    const seasonPoints: IUserSeasonPoints[] = [];
    const weekRecords: IUserWeekRecord[] = [];
    let totalBullseyes = 0;
    let totalBets = 0;
    let totalWins = 0;

    for (const { cachedRanking, matches, season } of validSeasons) {
      const matchIds = matches.map((match) => match.id);
      const dummyUser = { color: '', icon: '', id: userId, name: '', timestamp: 0 } as IUser;

      let userBets;
      let seasonBullseyes;
      let seasonBets;
      let seasonWins;

      if (cachedRanking) {
        userBets = await this.betService.getUserMatchesBetsByMatchIds(matchIds, userId);

        seasonPoints.push({
          percentage: cachedRanking.percentage,
          points: cachedRanking.points,
          position: cachedRanking.position,
          season,
          seasonLabel: getSeasonLabel(season),
          totalParticipants: cachedRanking.totalParticipants,
          totalPossiblePoints: cachedRanking.totalPossiblePoints
        });
        seasonBullseyes = cachedRanking.bullseye;
        seasonBets = cachedRanking.totalBets;
        seasonWins = cachedRanking.winner;
      } else {
        const [liveUserBets, seasonUsers, allBets] = await Promise.all([
          this.betService.getUserMatchesBetsByMatchIds(matchIds, userId),
          this.getBySeason(season),
          this.betService.getStartedMatchesBetsByMatchIds(matchIds)
        ]);
        userBets = liveUserBets;

        const seasonMaxPoints = calculateMaxPoints(season, matches);
        const seasonRankingLine = calculateUserPoints(dummyUser, matches, userBets, seasonMaxPoints);

        const seasonPercentage = seasonMaxPoints > 0 ? (seasonRankingLine.score.total / seasonMaxPoints) * 100 : 0;

        const seasonRanking = seasonUsers
          .map((seasonUser) => calculateUserPoints(seasonUser, matches, allBets, seasonMaxPoints))
          .sort((a, b) => b.score.total - a.score.total || b.score.bullseye - a.score.bullseye);

        const userPosition = seasonRanking.findIndex((rankingLine) => rankingLine.user.id === userId);

        seasonPoints.push({
          percentage: parseFloat(seasonPercentage.toFixed(1)),
          points: seasonRankingLine.score.total,
          position: userPosition === -1 ? seasonRanking.length + 1 : userPosition + 1,
          season,
          seasonLabel: getSeasonLabel(season),
          totalParticipants: seasonRanking.length,
          totalPossiblePoints: seasonMaxPoints
        });
        seasonBullseyes = seasonRankingLine.score.bullseye;
        seasonBets = seasonRankingLine.betsCount;
        seasonWins = seasonRankingLine.score.winner;
      }

      totalBullseyes += seasonBullseyes;
      totalBets += seasonBets;
      totalWins += seasonWins;

      const weeks = [...new Set(matches.map((match) => match.week))];

      weeks.forEach((week) => {
        // Regular season weeks always award 10 max points per bet; playoff weeks award more
        if (maxPointsPerBet.season(season, week) !== 10) {
          return;
        }

        const weekMatches = matches.filter((match) => match.week === week);
        const weekMaxPoints = calculateMaxPoints(season, weekMatches);
        const weekRankingLine = calculateUserPoints(dummyUser, weekMatches, userBets, weekMaxPoints);

        // Only consider weeks where the user bet on at least 90% of the matches
        const minRequiredBets = Math.ceil(weekMatches.length * 0.9);
        if (weekRankingLine.betsCount < minRequiredBets) {
          return;
        }

        weekRecords.push({
          bullseye: weekRankingLine.score.bullseye,
          percentage: parseFloat(weekRankingLine.score.percentage),
          points: weekRankingLine.score.total,
          season,
          seasonLabel: getSeasonLabel(season),
          totalPossiblePoints: weekMaxPoints,
          week
        });
      });
    }

    const sortedWeekRecords = weekRecords.sort((a, b) => b.percentage - a.percentage);
    const topWeeks = sortedWeekRecords.slice(0, 20);
    const bottomWeeks = sortedWeekRecords.slice(weekRecords.length - 20, weekRecords.length);

    return {
      seasons: seasonPoints,
      topWeeks,
      bottomWeeks,
      totalBets,
      totalBullseyes,
      totalWins
    };
  }

  async getUserSeasons(userId: number) {
    const rows = (await db.query(
      `SELECT SQL_NO_CACHE DISTINCT id_season as season
        FROM users_season
        WHERE id_user = ?
        ORDER BY id_season ASC`,
      [userId]
    )) as { season: number }[];

    return rows.map((row) => row.season);
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

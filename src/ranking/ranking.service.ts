import db from "#database/db.ts";

export class RankingService {
  async getAll() {
    const rows = await db.query(`SELECT SQL_NO_CACHE * FROM teams`, []);

    return rows;
  }
}

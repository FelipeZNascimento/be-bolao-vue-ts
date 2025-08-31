import db from "#database/db.ts";

export class InitService {
  async getInfo(season: number) {
    const rows = await db.query(
      `SELECT SQL_NO_CACHE seasons.id, seasons.description FROM seasons
        WHERE seasons.id = ?`,
      [season],
    );

    return rows;
  }
}

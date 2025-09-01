import db from "#database/db.ts";

export interface ITeam {
  alias: string;
  background: string;
  code: string;
  conference: string;
  division: string;
  foreground: string;
  id: number;
  name: string;
}

export class TeamService {
  async getAll() {
    return (await db.query(`SELECT SQL_NO_CACHE * FROM teams`, [])) as ITeam[];
  }
}

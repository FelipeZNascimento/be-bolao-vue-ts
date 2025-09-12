import { ITeam } from "#team/team.types.ts";
import { RowDataPacket } from "mysql2/promise";

export interface IMatch extends RowDataPacket {
  away: ITeam | null;
  awayScore: number;
  clock: string;
  home: ITeam | null;
  homeScore: number;
  homeTeamOdds: string;
  id: number;
  idAwayTeam: number;
  idHomeTeam: number;
  overUnder: string;
  possession: "away" | "home" | null;
  season: number;
  status: number;
  timestamp: number;
  week: number;
}

export interface IWeek extends RowDataPacket {
  week: number;
}

import type { IUser } from "#user/user.types.js";

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

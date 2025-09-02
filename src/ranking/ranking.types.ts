import { IUser } from "#user/user.service.ts";

export interface IRankingLine {
  betsCount: number;
  matchesCount: number;
  score: IRankingScore;
  user: Pick<IUser, "color" | "icon" | "id" | "isOnline" | "name">;
}

export interface IRankingScore {
  bullseye: number;
  extras: number;
  percentage: string;
  total: number;
  winner: number;
}

export interface IRawExtras {
  "1": number;
  "2": number;
  "3": number;
  "4": number;
  "5": number;
  "6": number;
  "7": number;
  "8": number;
  "9": number;
  "10": number;
  "11": number;
  "12": number[];
  "13": number[];
  TExtraType: number;
}

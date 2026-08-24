export interface IUserRecords {
  seasons: IUserSeasonPoints[];
  topWeeks: IUserWeekRecord[];
  bottomWeeks: IUserWeekRecord[];
  totalBullseyes: number;
  totalBets: number;
  totalWins: number;
}

export interface IUserSeasonPoints {
  percentage: number;
  points: number;
  position: number;
  season: number;
  seasonLabel: string;
  totalParticipants: number;
  totalPossiblePoints: number;
}

export interface IUserWeekRecord {
  bullseye: number;
  percentage: number;
  points: number;
  season: number;
  seasonLabel: string;
  totalPossiblePoints: number;
  week: number;
}

export interface ISeasonRankingRow {
  bullseye: number;
  extras: number;
  percentage: string;
  points: number;
  position: number;
  totalBets: number;
  totalGames: number;
  totalParticipants: number;
  totalPossibleExtras: null | number;
  totalPossiblePoints: number;
  season: {
    id: number;
    label: string;
  };
  user: {
    id: number;
    color: string;
    icon: string;
    name: string;
  };
  winner: number;
}

export interface IUser {
  admin: boolean;
  active: boolean;
  color: string;
  email: string;
  extraBetsCount?: number;
  favorites?: string[];
  fleaflicker?: {
    leagueId: null | number;
    teamId: null | number;
  } | null;
  fullName: string;
  icon: string;
  id: number;
  isOnline: boolean;
  name: string;
  position?: number;
  seasonId: number;
  timestamp: number;
}

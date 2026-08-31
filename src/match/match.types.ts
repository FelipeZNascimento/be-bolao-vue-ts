import { ITeam } from '#team/team.types.js';
import { RowDataPacket } from 'mysql2/promise';

export interface IMatch extends RowDataPacket {
  away: ITeam | null;
  awayScore: number;
  clock: string;
  home: ITeam | null;
  homeScore: number;
  homeTeamOdds: string;
  id: number;
  espnId: number;
  idAwayTeam: number;
  idHomeTeam: number;
  overUnder: string;
  possession: 'away' | 'home' | null;
  season: number;
  status: number;
  timestamp: number;
  week: number;
}

export interface IWeek extends RowDataPacket {
  week: number;
}

// ---------- ESPN Summary API types ----------

export interface IEspnTeamRef {
  abbreviation: string;
  displayName: string;
  id: string;
  logo?: string;
  shortDisplayName?: string;
  uid?: string;
}

export interface IEspnStatistic {
  displayValue: string;
  label: string;
  name: string;
  value: number | string;
}

export interface IEspnTeamStatistics {
  displayOrder: number;
  homeAway: 'away' | 'home';
  statistics: IEspnStatistic[];
  team: IEspnTeamRef;
}

export interface IEspnAthleteRef {
  displayName: string;
  firstName?: string;
  fullName?: string;
  id: string;
  jersey?: string;
  lastName?: string;
  shortName?: string;
}

export interface IEspnPlayerStatLine {
  athlete: IEspnAthleteRef;
  stats: string[];
}

export interface IEspnPlayerStatCategory {
  athletes: IEspnPlayerStatLine[];
  descriptions: string[];
  keys: string[];
  labels: string[];
  name: string;
  text: string;
  totals: string[];
}

export interface IEspnTeamPlayers {
  statistics: IEspnPlayerStatCategory[];
  team: IEspnTeamRef;
}

export interface IEspnInjuryDetails {
  detail?: string;
  location?: string;
  returnDate?: string;
  side?: string;
  type?: string;
}

export interface IEspnInjury {
  athlete: IEspnAthleteRef;
  date: string;
  details?: IEspnInjuryDetails;
  status: string;
  type: {
    abbreviation: string;
    description: string;
    id: string;
    name: string;
  };
}

export interface IEspnTeamInjuries {
  injuries: IEspnInjury[];
  team: IEspnTeamRef;
}

export interface IEspnLeaderEntry {
  athlete: IEspnAthleteRef;
  displayValue: string;
  value: number;
}

export interface IEspnLeaderCategory {
  displayName: string;
  leaders: IEspnLeaderEntry[];
  name: string;
}

export interface IEspnTeamLeaders {
  leaders: IEspnLeaderCategory[];
  team: IEspnTeamRef;
}

export interface IEspnVenue {
  address?: {
    city?: string;
    country?: string;
    state?: string;
    zipCode?: string;
  };
  fullName: string;
  grass?: boolean;
  id: string;
  images?: { href: string }[];
}

export interface IEspnWeather {
  conditionId?: string;
  displayValue?: string;
  gust?: number;
  humidity?: number;
  temperature?: number;
  type?: number;
}

export interface IEspnOfficial {
  displayName: string;
  fullName: string;
  order: number;
  position: {
    displayName: string;
    id: string;
    name: string;
  };
}

export interface IEspnGameInfo {
  attendance?: number;
  officials?: IEspnOfficial[];
  venue: IEspnVenue;
  weather?: IEspnWeather;
}

export interface IEspnLinescore {
  displayValue: string;
}

export interface IEspnTeamLinescores {
  linescores: IEspnLinescore[];
  team: IEspnTeamRef;
}

export interface IEspnDrive {
  description: string;
  id: string;
  team: IEspnTeamRef;
}

export interface IEspnDrives {
  current?: IEspnDrive;
  previous: IEspnDrive[];
}

export interface IEspnScoringPlay {
  awayScore: number;
  clock: {
    displayValue: string;
  };
  homeScore: number;
  id: string;
  period: {
    number: number;
  };
  scoringType: {
    abbreviation: string;
    displayName: string;
    name: string;
  };
  team: IEspnTeamRef;
  text: string;
}

export interface IEspnArticle {
  headline: string;
  id: number;
  published?: string;
  story: string;
}

export interface IEspnSummaryResponse {
  article?: IEspnArticle;
  boxscore?: {
    players: IEspnTeamPlayers[];
    teams: IEspnTeamStatistics[];
  };
  drives?: IEspnDrives;
  gameInfo?: IEspnGameInfo;
  header?: {
    competitions: {
      competitors: IEspnTeamLinescores[];
    }[];
  };
  injuries?: IEspnTeamInjuries[];
  leaders?: IEspnTeamLeaders[];
  scoringPlays?: IEspnScoringPlay[];
}

// ---------- Mapped/parsed structure ----------

export interface IMatchTeamSummary {
  injuries: IEspnInjury[];
  leaders: IEspnLeaderCategory[];
  players: IEspnPlayerStatCategory[];
  statistics: IEspnStatistic[];
}

export interface IMatchSummary {
  article: IEspnArticle[];
  away: IMatchTeamSummary;
  drives: IEspnDrive[];
  gameInfo: IEspnGameInfo & { linescores: IEspnTeamLinescores[] };
  home: IMatchTeamSummary;
  scoringPlays: IEspnScoringPlay[];
}

import type { ISeasonRankingRow } from '#user/user.types.js';

export interface IFleaflickerStandings {
  all: ISeasonRankingRow[];
  bySeason: Record<number, ISeasonRankingRow[]>;
  byUser: Record<number, ISeasonRankingRow[]>;
}

export interface IFormattedNumber {
  formatted: string;
  value?: number;
}

export interface IPeriod {
  isNow?: boolean;
  ordinal: number;
  startEpochMilli?: string;
}

export interface IProTeam {
  abbreviation: string;
  location: string;
  name: string;
}

export interface IProPlayer {
  headshotUrl?: string;
  id: number;
  injury?: {
    description: string;
    severity: string;
    typeAbbreviaition: string;
    typeFull: string;
  };
  nameFirst: string;
  nameFull: string;
  nameLast: string;
  nameShort: string;
  nflByeWeek?: number;
  position: string;
  percentOwnedRatio?: number;
  positionEligibility?: string[];
  proTeam?: IProTeam;
  proTeamAbbreviation?: string;
}

export interface IFantasyTeamRecord {
  formatted: string;
  rank?: number;
  winPercentage: IFormattedNumber;
}

export interface IFantasyTeamSummary {
  id: number;
  initials: string;
  logoUrl?: string;
  name: string;
  newItemCounts?: Record<string, number>;
  pointsAgainst: IFormattedNumber;
  pointsFor: IFormattedNumber;
  recordDivision: IFantasyTeamRecord;
  recordOverall: IFantasyTeamRecord;
  recordPostseason: IFantasyTeamRecord;
  streak: { formatted: string };
  waiverAcquisitionBudget: IFormattedNumber;
}

export interface IStatCategory {
  abbreviation: string;
  id: number;
  nameSingular: string;
  namePlural: string;
}

export interface IStatEntry {
  category: IStatCategory;
  value?: IFormattedNumber;
}

export interface IProGameSummary {
  away: IProTeam;
  awayResult?: string;
  awayScore?: number;
  home: IProTeam;
  homeResult?: string;
  homeScore?: number;
  id: number;
  period?: IPeriod;
  startTimeEpochMilli: string;
  status?: string;
}

export interface IRankInfo {
  isRankTied?: boolean;
  mean: IFormattedNumber;
  rank: number;
  rating?: string;
}

export interface IRankCategory {
  category: IStatCategory;
  rank: IRankInfo;
}

export interface IPlayerRanks {
  categories: IRankCategory[];
  defaultPoints: IRankInfo;
  position: string;
}

export interface IRequestedGame {
  game: IProGameSummary;
  participant?: 'AWAY' | 'HOME';
  period: IPeriod;
  pointsActual?: IFormattedNumber;
  pointsProjected?: IFormattedNumber;
  ranks?: IPlayerRanks;
  stats?: IStatEntry[];
  statsProjected?: IStatEntry[];
}

export interface IRankDraftPosition {
  formatted: string;
  ordinal: number;
  position: { colors?: string[]; eligibility: string[]; group: string; label: string };
  rating?: string;
}

export interface IRankDraft {
  ordinal: number;
  positions: IRankDraftPosition[];
  season: number;
}

export interface IBoxscorePlayerEntry {
  displayGroup: string;
  isKeeper?: boolean;
  lastX: { duration: number }[];
  owner: { id: number; initials: string; logoUrl?: string; name: string };
  proPlayer: IProPlayer;
  rankDraft?: IRankDraft;
  rankFantasy?: IRankDraft;
  requestedGames: IRequestedGame[];
  requestedGamesPeriod: IPeriod;
  viewingActualPoints?: IFormattedNumber;
  viewingActualStats?: IStatEntry[];
  viewingFormat: string;
  viewingProjectedPoints?: IFormattedNumber;
  viewingProjectedStats?: IStatEntry[];
  viewingRange: { low: number };
}

export interface IBoxscoreSlotPosition {
  colors?: string[];
  eligibility: string[];
  group: string;
  label: string;
  max?: number;
  min?: number;
  start?: number;
}

export interface IBoxscoreLineupSlot {
  away?: IBoxscorePlayerEntry;
  home?: IBoxscorePlayerEntry;
  leaguePlayer?: IBoxscorePlayerEntry;
  position: IBoxscoreSlotPosition;
  positionColor?: string[];
}

export interface IBoxscoreLineup {
  group: string;
  slots: IBoxscoreLineupSlot[];
}

export interface IBoxscoreTeamScore {
  alreadyPlayed?: number;
  alreadyPlayedPositions?: string[];
  projected?: IFormattedNumber;
  score: IFormattedNumber;
  yetToPlay: number;
  yetToPlayPositions: string[];
}

export interface IBoxscoreGame {
  away: IFantasyTeamSummary;
  awayScore: IBoxscoreTeamScore;
  home: IFantasyTeamSummary;
  homeScore: IBoxscoreTeamScore;
  id: string;
  isDivisional?: boolean;
  isInProgress?: boolean;
  isWinProbabilitySet?: boolean;
  winProbability?: number;
}

export interface IFleaflickerBoxscore {
  eligiblePeriods: IPeriod[];
  game: IBoxscoreGame;
  lineups: IBoxscoreLineup[];
  scoringPeriod: IPeriod;
}

export interface IScoreboardTeamScore {
  alreadyPlayed?: number;
  alreadyPlayedPositions?: string[];
  score: IFormattedNumber;
  yetToPlay: number;
  yetToPlayPositions: string[];
}

export interface IScoreboardGame {
  away: IFantasyTeamSummary;
  awayScore: IScoreboardTeamScore;
  home: IFantasyTeamSummary;
  homeScore: IScoreboardTeamScore;
  id: string;
  isDivisional?: boolean;
  isInProgress?: boolean;
}

export interface ISchedulePeriod {
  containsNow?: boolean;
  low: IPeriod;
  ordinal: number;
  value: number;
}

export interface IFleaflickerScoreboard {
  eligibleSchedulePeriods: ISchedulePeriod[];
  games: IScoreboardGame[];
  schedulePeriod: ISchedulePeriod;
}

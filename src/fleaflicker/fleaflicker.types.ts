import type { ISeasonRankingRow } from '#user/user.types.js';

export interface IFleaflickerStandings {
  all: ISeasonRankingRow[];
  bySeason: Record<number, ISeasonRankingRow[]>;
  byUser: Record<number, ISeasonRankingRow[]>;
}

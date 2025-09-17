import { ITeam } from "#team/team.types.ts";

import { MATCH_STATUS, MatchStatus } from "./match.constants.ts";
import { IMatch } from "./match.types.ts";

export const isMatchEnded = (status: MatchStatus) => {
  return status === MATCH_STATUS.FINAL || status === MATCH_STATUS.FINAL_OVERTIME || status === MATCH_STATUS.CANCELLED;
};

export const parseQueryResponse = (match: IMatch, homeTeam: ITeam, awayTeam: ITeam) => {
  return {
    away: {
      alias: awayTeam.alias,
      background: awayTeam.background,
      code: awayTeam.code,
      foreground: awayTeam.foreground,
      id: awayTeam.id,
      name: awayTeam.name,
      possession: match.possession === "away",
      score: match.awayScore,
    },
    clock: match.clock,
    home: {
      alias: homeTeam.alias,
      background: homeTeam.background,
      code: homeTeam.code,
      foreground: homeTeam.foreground,
      id: homeTeam.id,
      name: homeTeam.name,
      possession: match.possession === "home",
      score: match.homeScore,
    },
    homeTeamOdds: match.homeTeamOdds,
    id: match.id,
    overUnder: match.overUnder,
    status: match.status,
    timestamp: match.timestamp,
  };
};

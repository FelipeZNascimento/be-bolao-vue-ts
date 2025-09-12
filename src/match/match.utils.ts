import { MATCH_STATUS, MatchStatus } from "./match.constants.ts";

export const isMatchEnded = (status: MatchStatus) => {
  return status === MATCH_STATUS.FINAL || status === MATCH_STATUS.FINAL_OVERTIME || status === MATCH_STATUS.CANCELLED;
};

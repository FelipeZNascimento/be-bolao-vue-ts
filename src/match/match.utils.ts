import type { IMatch } from "#match/match.types.js";
import type { ITeam } from "#team/team.types.js";

import { IBet } from "#bet/bet.types.js";
import { MATCH_STATUS, MatchStatus } from "#match/match.constants.js";

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
      winLosses: awayTeam.winLosses ?? "",
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
      winLosses: homeTeam.winLosses ?? "",
    },
    homeTeamOdds: match.homeTeamOdds,
    id: match.id,
    overUnder: match.overUnder,
    status: match.status,
    timestamp: match.timestamp,
  };
};

export const mergeBetsToMatches = (
  teams: ITeam[],
  matches: IMatch[],
  bets: IBet[],
  userBets: IBet[],
  userId: null | number = null,
) => {
  return matches.map((match) => {
    let loggedUserBetsObject = null;

    // Filter logged user bets
    if (userBets.length > 0) {
      loggedUserBetsObject = userBets
        .filter((bet) => bet.matchId === match.id && bet.userId === userId)
        .map((bet) => ({
          id: bet.id,
          matchId: bet.matchId,
          user: {
            color: bet.userColor,
            icon: bet.userIcon,
            id: bet.userId,
            name: bet.userName,
          },
          value: bet.betValue,
        }))[0];
    }

    const allBetsObject = bets
      .filter((bet) => bet.matchId === match.id && bet.userId !== userId)
      .sort((a, b) => a.userName.localeCompare(b.userName))
      .map((bet) => ({
        id: bet.id,
        matchId: bet.matchId,
        user: {
          color: bet.userColor,
          icon: bet.userIcon,
          id: bet.userId,
          name: bet.userName,
        },
        value: bet.betValue,
      }));

    const awayTeam = teams.find((team) => team.id === match.idTeamAway);
    const homeTeam = teams.find((team) => team.id === match.idTeamHome);

    if (!awayTeam || !homeTeam) {
      throw new Error("Equipe não encontrada");
    }

    const parsedResponse = parseQueryResponse(match, homeTeam, awayTeam);

    return {
      ...parsedResponse,
      bets: allBetsObject,
      loggedUserBets: loggedUserBetsObject,
    };
  });
};

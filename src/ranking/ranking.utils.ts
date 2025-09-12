import { IBet, IExtraBet } from "#bet/bet.types.ts";
import { BET_VALUES, BetsValues, EXTRA_BETS_MAPPING, maxPointsPerBet } from "#bet/bet.utils.ts";
import { IMatch } from "#match/match.types.ts";
import { isMatchEnded } from "#match/match.utils.ts";
import { IUser } from "#user/user.types.ts";

import { IRankingLine, IRawExtras } from "./ranking.types.ts";
/**
 * buildWeeklyUserRanking - Builds the weekly ranking.
 *
 * @users: All users to include in the ranking.
 * @matches: The set of matches to calculate the points from.
 * @bets: The bets placed by the users.
 * @totalPossiblePoints: The total possible points a user could have achieved in that set of matches.
 *
 * @return: The ranking line for all users.
 */
export const buildWeeklyUserRanking = (
  users: IUser[],
  matches: IMatch[],
  bets: IBet[],
  totalPossiblePoints: number,
) => {
  const ranking = users
    .map((user) => {
      const rankingLine = calculateUserPoints(user, matches, bets, totalPossiblePoints);

      return rankingLine;
    })
    .sort(
      (a, b) =>
        b.score.total - a.score.total || b.score.bullseye - a.score.bullseye || a.user.name.localeCompare(b.user.name),
    );

  let position = 1;
  ranking.forEach((rankingLine, index) => {
    if (index === 0) {
      rankingLine.user.position = position;
    } else {
      if (
        rankingLine.score.total === ranking[index - 1].score.total &&
        rankingLine.score.bullseye === ranking[index - 1].score.bullseye
      ) {
        rankingLine.user.position = ranking[index - 1].user.position;
      } else {
        rankingLine.user.position = position;
      }
    }
    position++;
  });

  return ranking;
};

/**
 * buildSeasonUserRanking - Builds the seasonal ranking.
 *
 * @users: All users to include in the ranking.
 * @matches: The set of matches to calculate the points from.
 * @bets: The bets placed by the users.
 * @extras: The extra bets placed by the users.
 * @extrasResults: The correct extra bets results.
 * @totalPossiblePoints: The total possible points a user could have achieved in that set of matches.
 *
 * @return: The ranking line for all users.
 */
export const buildSeasonUserRanking = (
  users: IUser[],
  matches: IMatch[],
  bets: IBet[],
  extras: IExtraBet[],
  extrasResults: IExtraBet | null,
  totalPossiblePoints: number,
) => {
  const ranking = users
    .map((user) => {
      const extrasReward = calculateExtrasReward(user, extras, extrasResults);
      const rankingLine = calculateUserPoints(user, matches, bets, totalPossiblePoints);

      rankingLine.score.total += extrasReward;
      rankingLine.score.extras = extrasReward;

      return rankingLine;
    })
    .sort(
      (a, b) =>
        b.score.total - a.score.total || b.score.bullseye - a.score.bullseye || a.user.name.localeCompare(b.user.name),
    );

  let position = 1;
  ranking.forEach((rankingLine, index) => {
    if (index === 0) {
      rankingLine.user.position = position;
    } else {
      if (
        rankingLine.score.total === ranking[index - 1].score.total &&
        rankingLine.score.bullseye === ranking[index - 1].score.bullseye
      ) {
        rankingLine.user.position = ranking[index - 1].user.position;
      } else {
        rankingLine.user.position = position;
      }
    }
    position++;
  });

  return ranking;
};

/**
 * calculateUserPoints - For a specific user and for a set of matches, calculates how many points they will be rewarded from their bets.
 *
 * @user: The user to calculate the points for.
 * @matches: The set of matches to calculate the points from.
 * @bets: The bets placed by the user.
 * @totalPossiblePoints: The total possible points the user could have achieved in that set of matches.
 *
 * @return: The ranking line for that user in that set of matches.
 */
const calculateUserPoints = (user: IUser, matches: IMatch[], bets: IBet[], totalPossiblePoints: number) => {
  let points = 0;
  let bullseyeCount = 0;
  let winnersCount = 0;
  let betsCount = 0;

  matches.forEach((match) => {
    // Returns the bullseye value for this bet depending on season and week
    const maxPoints = maxPointsPerBet.season(match.season, match.week);

    // From all bets, filter the ones related to current user and match
    const matchBets = bets.filter((bet) => bet.matchId === match.id && bet.userId === user.id);

    // If there are no bets for this match, stop calculating
    if (matchBets.length === 0) {
      return;
    }

    betsCount++;
    const userBet: BetsValues = matchBets[0].betValue; // 0, 1, 2, 3 (away hard, away easy, home easy, home hard)
    const betPoints = calculateBetReward(match, userBet, maxPoints); // Calculate how many points the user will be rewarded considering bet and maxPoints
    points += betPoints;

    if (betPoints > 0) {
      winnersCount++;
    }

    if (betPoints === maxPoints) {
      bullseyeCount++;
    }
  });

  const totalPercentage = totalPossiblePoints > 0 ? (points / totalPossiblePoints) * 100 : 0;

  const fiveMinAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  let isOnline = false;
  if (user.timestamp >= fiveMinAgo) {
    isOnline = true;
  }

  const rankingLine: IRankingLine = {
    betsCount,
    matchesCount: matches.length,
    score: {
      bullseye: bullseyeCount,
      extras: 0,
      percentage: totalPercentage.toFixed(1),
      total: points,
      winner: winnersCount,
    },
    user: {
      color: user.color,
      icon: user.icon,
      id: user.id,
      isOnline: isOnline,
      name: user.name,
    },
  };

  return rankingLine;
};

/**
 * calculateBetReward - For a specific match, calculates the points a user will be rewarded from their bet.
 *
 * @match: The match where the bet was placed.
 * @betValue: The bet placed by the user, in BetsValues.
 * @maxPoints: Maximum points that match can award.
 *
 * @return: The maximum points for the user in that set of matches, in that season.
 */
const calculateBetReward = (match: IMatch, betValue: BetsValues, maxPoints: number) => {
  if (match.awayScore - match.homeScore > 0) {
    // away team won
    if (match.awayScore - match.homeScore > 7) {
      // away team won by more than 7 points (easy win)
      if (betValue === BET_VALUES.AWAY_EASY) {
        return maxPoints;
      } else if (betValue === 1) {
        return maxPoints / 2;
      } else {
        return 0;
      }
    } else {
      // hard win
      if (betValue === BET_VALUES.AWAY_EASY) {
        return maxPoints / 2;
      } else if (betValue === 1) {
        return maxPoints;
      } else {
        return 0;
      }
    }
  } else if (match.homeScore - match.awayScore > 0) {
    // home team won
    if (match.homeScore - match.awayScore > 7) {
      // home team won by more than 7 points (easy win)
      if (betValue === BET_VALUES.HOME_EASY) {
        return maxPoints;
      } else if (betValue === 2) {
        return maxPoints / 2;
      } else {
        return 0;
      }
    } else {
      if (betValue === BET_VALUES.HOME_EASY) {
        return maxPoints / 2;
      } else if (betValue === 2) {
        return maxPoints;
      } else {
        return 0;
      }
    }
  } else {
    if (betValue === BET_VALUES.AWAY_HARD || betValue === BET_VALUES.HOME_HARD) {
      return maxPoints / 2;
    }
  }

  return 0;
};

/**
 * calculateExtrasReward - Calculates how many points a user will be rewarded from Extra Bets.
 *
 * @user: The user to calculate the points for.
 * @extras: The extra bets that user made.
 * @extrasResults: The correct results of the extra bets.
 *
 * @return: The maximum points for the user in that set of matches, in that season.
 */
const calculateExtrasReward = (user: IUser, extras: IExtraBet[], extrasResults: IExtraBet | null) => {
  // return 0;

  if (extras.length === 0 || !extrasResults) {
    return 0;
  }

  const userExtras = extras.find((extraBet) => extraBet.idUser === user.id);
  if (userExtras === undefined) {
    return 0;
  }

  let extraBetsPoints = 0;
  const userExtrasParsed = JSON.parse(userExtras.json) as IRawExtras;
  const extrasResultsParsed = JSON.parse(extrasResults.json) as IRawExtras;

  const keys = Object.keys(userExtrasParsed) as (keyof typeof userExtrasParsed)[];

  keys.forEach((key) => {
    if (
      parseInt(key) === EXTRA_BETS_MAPPING.AFC_WILDCARD.TYPE ||
      parseInt(key) === EXTRA_BETS_MAPPING.NFC_WILDCARD.TYPE
    ) {
      const keyValue = userExtrasParsed[key] as number[];
      keyValue.forEach((wildCardBet) => {
        const resultsKeyValue = extrasResultsParsed[key] as number[];
        if (resultsKeyValue.find((wildCardBetResult) => wildCardBetResult === wildCardBet) !== undefined) {
          extraBetsPoints += maxPointsPerBet.extra(parseInt(key));
        }
      });
    } else if (userExtrasParsed[key] === extrasResultsParsed[key]) {
      extraBetsPoints += maxPointsPerBet.extra(parseInt(key));
    }
  });

  return extraBetsPoints;
};

/**
 * calculateMaxPoints - Calculates the maximum points for a set of matches in a season.
 *
 * @season: The season to calculate the points for.
 * @matches: The matches to calculate the points from.
 *
 * @return: The maximum points for the user in that set of matches, in that season.
 */
export const calculateMaxPoints = (season: number, matches: IMatch[]): number => {
  return matches.reduce(
    (acumulator: number, match: IMatch) => acumulator + maxPointsPerBet.season(season, match.week),
    0,
  );
};

/**
 * isWeekLocked - Calculates whether a week is locked based on the matches statuses.
 *
 * @matches: The matches to be checked.
 *
 * @return: Whether the week is locked.
 */
export const isWeekLocked = (matches: IMatch[]): boolean => {
  return matches.every((match: IMatch) => isMatchEnded(match.status));
};

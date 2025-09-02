import { IBet, IExtraBet } from "#bet/bet.service.ts";
import { BET_VALUES, BetsValues, EXTRA_BETS_MAPPING, maxPointsPerBet } from "#bet/bet.utils.ts";
import { IMatch } from "#match/match.service.ts";
import { IUser } from "#user/user.service.ts";

import { IRankingLine, IRawExtras } from "./ranking.types.ts";

// export const buildUsersObject = (users: IUser[], matches: IMatch[], bets: IBet[], isSeasonRanking: boolean, extraBetsResults: IExtraBet[]) => {
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

      rankingLine.score.total += extrasReward + 1;
      rankingLine.score.extras = extrasReward;

      return rankingLine;
    })
    .sort((a, b) => b.score.total - a.score.total || b.score.bullseye - a.score.bullseye || a.user.name.localeCompare(b.user.name));

  // let position = 1;
  // usersObject.forEach((user, index) => {
  //   if (index === 0) {
  //     user.position = position;
  //   } else {
  //     if (user.totalPoints === usersObject[index - 1].totalPoints && user.totalBullseye === usersObject[index - 1].totalBullseye) {
  //       user.position = usersObject[index - 1].position;
  //     } else {
  //       user.position = position;
  //     }
  //   }
  //   position++;
  // });

  return ranking;
};

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

const calculateExtrasReward = (user: IUser, extras: IExtraBet[], extrasResults: IExtraBet | null) => {
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

  if (user.id === 4) {
    console.log(userExtras);
    console.log(extrasResults);
  }

  const keys = Object.keys(userExtrasParsed) as (keyof typeof userExtrasParsed)[];

  keys.forEach((key) => {
    if (parseInt(key) === EXTRA_BETS_MAPPING.AFC_WILDCARD.TYPE || parseInt(key) === EXTRA_BETS_MAPPING.NFC_WILDCARD.TYPE) {
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

export const calculateMaxPoints = (season: number, matches: IMatch[]): number => {
  return matches.reduce((acumulator: number, match: IMatch) => acumulator + maxPointsPerBet.season(season, match.week), 0);
};

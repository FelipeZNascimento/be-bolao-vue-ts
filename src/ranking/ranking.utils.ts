import { IBet } from "#bet/bet.service.ts";
import { BET_VALUES, BetsValues, maxPointsPerBet } from "#bet/bet.utils.ts";
import { IMatch } from "#match/match.service.ts";
import { IUser } from "#user/user.service.ts";

// export const buildUsersObject = (users: IUser[], matches: IMatch[], bets: IBet[], isSeasonRanking: boolean, extraBetsResults: IExtraBet[]) => {
export const buildUsersObject = (users: IUser[], matches: IMatch[], bets: IBet[], isSeasonRanking: boolean) => {
  const usersObject = users
    .map((user) => {
      if (isSeasonRanking) {
        const totalExtras = 0;
        // const totalExtras = calculateUserExtraPoints(user, additionalInfo.extraBets, extraBetsResults);
        // const userObject = calculateUserPoints(user, matches, bets, additionalInfo.totalPossiblePoints);
        const userObject = calculateUserPoints(user, matches, bets, 1);

        userObject.totalPoints += totalExtras;
        userObject.totalExtras = totalExtras;

        return userObject;
      } else {
        // return calculateUserPoints(user, matches, bets, additionalInfo.totalPossiblePoints);
        return calculateUserPoints(user, matches, bets, 1);
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || b.totalBullseye - a.totalBullseye || a.name.localeCompare(b.name));

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

  return usersObject;
};

const calculateUserPoints = (user: IUser, matches: IMatch[], bets: IBet[], totalPossiblePoints: number) => {
  let totalPoints = 0;
  let totalBullseye = 0;
  let totalWinners = 0;
  let totalBets = 0;
  const totalMatches = matches.length;

  matches.forEach((match) => {
    const maxPoints = maxPointsPerBet.season(match.season, match.week);
    const matchBets = bets.filter((bet) => bet.matchId === match.id).filter((bet) => bet.userId === user.id);

    let betValue: BetsValues | null = null;
    if (matchBets.length > 0) {
      betValue = matchBets[0].betValue; // 0, 1, 2, 3 (away hard, away easy, home easy, home hard)
      totalBets++;
    }

    let betPoints = 0;
    if (betValue !== null && maxPoints) {
      betPoints = returnPoints(match, betValue, maxPoints);
      totalPoints += betPoints;
    }

    if (betPoints > 0) {
      totalWinners++;
      if (betPoints === maxPoints) {
        totalBullseye++;
      }
    }
  });

  const totalPercentage = totalPossiblePoints > 0 ? (totalPoints / totalPossiblePoints) * 100 : 0;

  const fiveMinAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  let isOnline = false;
  if (user.timestamp >= fiveMinAgo) {
    isOnline = true;
  }

  return {
    color: user.color,
    icon: user.icon,
    id: user.id,
    isOnline,
    name: user.name,
    totalBets,
    totalBullseye,
    totalExtras: 0,
    totalMatches,
    totalPercentage: totalPercentage.toFixed(1),
    totalPoints,
    totalWinners,
  };
};

const returnPoints = (match: IMatch, betValue: BetsValues, maxPoints: number) => {
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

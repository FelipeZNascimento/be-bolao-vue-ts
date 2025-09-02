/* eslint-disable perfectionist/sort-objects */
const SUPERBOWL_WINNER_POINTS = 100;
const CONFERENCE_CHAMPION_POINTS = 50;
const DIVISION_CHAMPION_POINTS = 20;
const WILD_CARD_POINTS = 10;

export type BetsValues = (typeof BET_VALUES)[keyof typeof BET_VALUES];

export const BET_VALUES = {
  AWAY_EASY: 0,
  AWAY_HARD: 1,
  HOME_HARD: 2,
  HOME_EASY: 3,
};

export const EXTRA_BETS_MAPPING = {
  SUPERBOWL: {
    TYPE: 1,
    POINTS: SUPERBOWL_WINNER_POINTS,
  },
  AFC_CHAMPION: {
    TYPE: 2,
    POINTS: CONFERENCE_CHAMPION_POINTS,
  },
  AFC_NORTH: {
    TYPE: 3,
    POINTS: DIVISION_CHAMPION_POINTS,
  },
  AFC_SOUTH: {
    TYPE: 4,
    POINTS: DIVISION_CHAMPION_POINTS,
  },
  AFC_EAST: {
    TYPE: 5,
    POINTS: DIVISION_CHAMPION_POINTS,
  },
  AFC_WEST: {
    TYPE: 6,
    POINTS: DIVISION_CHAMPION_POINTS,
  },
  NFC_CHAMPION: {
    TYPE: 7,
    POINTS: CONFERENCE_CHAMPION_POINTS,
  },
  NFC_NORTH: {
    TYPE: 8,
    POINTS: DIVISION_CHAMPION_POINTS,
  },
  NFC_SOUTH: {
    TYPE: 9,
    POINTS: DIVISION_CHAMPION_POINTS,
  },
  NFC_EAST: {
    TYPE: 10,
    POINTS: DIVISION_CHAMPION_POINTS,
  },
  NFC_WEST: {
    TYPE: 11,
    POINTS: DIVISION_CHAMPION_POINTS,
  },
  AFC_WILDCARD: {
    TYPE: 12,
    POINTS: WILD_CARD_POINTS,
  },
  NFC_WILDCARD: {
    TYPE: 13,
    POINTS: WILD_CARD_POINTS,
  },
};

const seasonMaxPoints = (season: number, week: number): number => {
  if (season >= 1 && season <= 8) {
    if (week >= 0 && week <= 17) {
      return 10;
    } else if (week === 18 || week === 19) {
      return 20;
    } else if (week === 20) {
      return 40;
    } else if (week === 21) {
      return 80;
    }
  } else {
    if (week >= 0 && week <= 18) {
      return 10;
    } else if (week === 19 || week === 20) {
      return 20;
    } else if (week === 21) {
      return 40;
    } else {
      return 80;
    }
  }

  return 0;
};

const extraPointsMapping = (extraType: number) => {
  if (extraType === EXTRA_BETS_MAPPING.SUPERBOWL.TYPE) {
    return EXTRA_BETS_MAPPING.SUPERBOWL.POINTS;
  }

  if (extraType === EXTRA_BETS_MAPPING.AFC_CHAMPION.TYPE || extraType === EXTRA_BETS_MAPPING.NFC_CHAMPION.TYPE) {
    return EXTRA_BETS_MAPPING.AFC_CHAMPION.POINTS;
  }

  if (
    extraType === EXTRA_BETS_MAPPING.AFC_NORTH.TYPE ||
    extraType === EXTRA_BETS_MAPPING.AFC_SOUTH.TYPE ||
    extraType === EXTRA_BETS_MAPPING.AFC_EAST.TYPE ||
    extraType === EXTRA_BETS_MAPPING.AFC_WEST.TYPE ||
    extraType === EXTRA_BETS_MAPPING.NFC_NORTH.TYPE ||
    extraType === EXTRA_BETS_MAPPING.NFC_SOUTH.TYPE ||
    extraType === EXTRA_BETS_MAPPING.NFC_EAST.TYPE ||
    extraType === EXTRA_BETS_MAPPING.NFC_WEST.TYPE
  ) {
    return EXTRA_BETS_MAPPING.AFC_NORTH.POINTS;
  }

  if (extraType === EXTRA_BETS_MAPPING.AFC_WILDCARD.TYPE || extraType === EXTRA_BETS_MAPPING.NFC_WILDCARD.TYPE) {
    return EXTRA_BETS_MAPPING.AFC_WILDCARD.POINTS;
  }

  return 0;
};

export const maxPointsPerBet = {
  extra: extraPointsMapping,
  season: seasonMaxPoints,
};

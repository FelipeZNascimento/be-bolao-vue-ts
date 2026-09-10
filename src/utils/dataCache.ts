import NodeCache from 'node-cache';

export const CACHE_KEYS = {
  TEAMS: 'TEAMS',
  CURRENT_WEEK: 'CURRENT_WEEK',
  WEEKLY_RANKING: 'WEEKLY_RANKING',
  MATCH_DETAILS: 'MATCH_DETAILS',
  PASSWORD_RESET: 'PASSWORD_RESET',
  USER_RECORDS: 'USER_RECORDS'
};

export const cachedInfo = new NodeCache();

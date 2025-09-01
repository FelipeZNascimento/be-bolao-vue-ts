/* eslint-disable perfectionist/sort-objects */
import NodeCache from "node-cache";

export const CACHE_KEYS = {
  TEAMS: 0,
  CURRENT_WEEK: 1,
};

export const cachedInfo = new NodeCache();

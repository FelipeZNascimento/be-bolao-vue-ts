// Season 13 started in 2025, so its first year is season + 2012
const SEASON_TO_FIRST_YEAR_OFFSET = 2012;

/**
 * getSeasonLabel - Maps a numeric season id to its real world year range.
 *
 * @season: The numeric season id.
 *
 * @return: The season label, e.g. "2025/2026".
 */
export const getSeasonLabel = (season: number): string => {
  const firstYear = season + SEASON_TO_FIRST_YEAR_OFFSET;
  return `${firstYear}/${firstYear + 1}`;
};

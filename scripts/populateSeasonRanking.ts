/**
 * End-of-season migration script: populates the `seasons_ranking` table with the final,
 * static ranking for a completed season, so `UserService.getUserRecords` (and any other
 * consumer) can read historical rankings instead of recalculating them on every request.
 *
 * Only run this AFTER a season is fully completed (all matches locked), otherwise the
 * script aborts without writing anything.
 *
 * Safe to re-run: rows are upserted (INSERT ... ON DUPLICATE KEY UPDATE) keyed by
 * (id_season, id_user).
 *
 * Usage: tsx --env-file .env scripts/populateSeasonRanking.ts <season>
 * Example: tsx --env-file .env scripts/populateSeasonRanking.ts 13
 */
import { BetService } from '#bet/bet.service.js';
import { connection } from '#database/db.js';
import db from '#database/db.js';
import { MatchService } from '#match/match.service.js';
import { buildSeasonUserRanking, calculateMaxPoints, isWeekLocked } from '#ranking/ranking.utils.js';
import { UserService } from '#user/user.service.js';

async function run() {
  const seasonArg = process.argv[2];
  if (!seasonArg || Number.isNaN(parseInt(seasonArg))) {
    throw new Error('Usage: tsx --env-file .env scripts/populateSeasonRanking.ts <season>');
  }
  const season = parseInt(seasonArg);

  const userService = new UserService();
  const matchService = new MatchService();
  const betService = new BetService();

  const matches = await matchService.getMatchesBySeason(season);
  if (matches.length === 0) {
    throw new Error(`No matches found for season ${season}.`);
  }
  if (!isWeekLocked(matches)) {
    throw new Error(`Season ${season} is not fully completed yet. Aborting.`);
  }

  const startedMatches = matches.filter((match) => match.status !== 0);
  const matchIds = startedMatches.map((match) => match.id);

  const [users, bets, extras, extrasResults] = await Promise.all([
    userService.getBySeason(season),
    betService.getStartedMatchesBetsByMatchIds(matchIds),
    // seasonStart is only used by these queries to gate "has the season started yet" for the
    // current/live season; for a completed historical season it's always in the past, so 0 works.
    betService.getExtras(season, 0),
    betService.getExtrasResults(season, 0)
  ]);

  const totalPossiblePoints = calculateMaxPoints(season, startedMatches);
  const ranking = buildSeasonUserRanking(
    users,
    startedMatches,
    bets,
    extras,
    extrasResults ? extrasResults[0] : null,
    totalPossiblePoints
  );

  let upserted = 0;
  for (const rankingLine of ranking) {
    await db.query(
      `INSERT INTO seasons_ranking
        (id_season, id_user, percentage, points, bullseye, winner, total_bets, total_games, position, total_participants, extras, total_possible_points)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          percentage = VALUES(percentage),
          points = VALUES(points),
          bullseye = VALUES(bullseye),
          winner = VALUES(winner),
          total_bets = VALUES(total_bets),
          total_games = VALUES(total_games),
          position = VALUES(position),
          total_participants = VALUES(total_participants),
          extras = VALUES(extras),
          total_possible_points = VALUES(total_possible_points)`,
      [
        season,
        rankingLine.user.id,
        rankingLine.score.percentage,
        rankingLine.score.total,
        rankingLine.score.bullseye,
        rankingLine.score.winner,
        rankingLine.betsCount,
        rankingLine.matchesCount,
        rankingLine.user.position,
        ranking.length,
        rankingLine.score.extras,
        totalPossiblePoints
      ]
    );
    upserted++;
  }

  console.log(`Done. Upserted ${upserted} seasons_ranking row(s) for season ${season}.`);
}

run()
  .catch((error: unknown) => {
    console.error('Failed to populate seasons_ranking:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void connection.end();
  });

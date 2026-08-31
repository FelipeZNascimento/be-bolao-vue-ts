/// <reference types="node" />
/**
 * Reads a CSV file produced by `fetchEspnMatchIds.ts` and updates the `matches` table's
 * `espn_id` column for season 14, matching rows by resolving the CSV's ESPN team ids
 * (`id_home_team`/`id_away_team`) to `teams.espn_id`, then to `matches.id_home_team`/
 * `matches.id_away_team` (which store `teams.id`) alongside `week`.
 *
 * Usage: tsx --env-file .env scripts/updateMatchEspnIds.ts <csvPath>
 * Example: tsx --env-file .env scripts/updateMatchEspnIds.ts scripts/output/espn-match-ids-week-1.csv
 */
import { connection } from '#database/db.js';
import db from '#database/db.js';
import { readFile } from 'node:fs/promises';

const SEASON_ID = 14;

interface ICsvRow {
  espn_id: string;
  id_away_team: string;
  id_home_team: string;
  week: string;
}

interface ITeamRow {
  espn_id: number;
  id: number;
}

function parseCsv(content: string): ICsvRow[] {
  const [headerLine, ...lines] = content.trim().split('\n');
  const headers = headerLine.split(',');

  return lines.map((line) => {
    const values = line.split(',');
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    return row as unknown as ICsvRow;
  });
}

async function run() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error('Usage: tsx --env-file .env scripts/updateMatchEspnIds.ts <csvPath>');
  }

  const content = await readFile(csvPath, 'utf-8');
  const rows = parseCsv(content);

  const teams = (await db.query(`SELECT id, espn_id FROM teams`, [])) as ITeamRow[];
  const teamIdByEspnId = new Map(teams.map((team) => [team.espn_id.toString(), team.id]));

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const homeTeamId = teamIdByEspnId.get(row.id_home_team);
    const awayTeamId = teamIdByEspnId.get(row.id_away_team);
    const week = parseInt(row.week);

    if (homeTeamId === undefined || awayTeamId === undefined || Number.isNaN(week)) {
      console.warn(`Skipping ESPN event ${row.espn_id}: could not resolve teams/week.`);
      skipped++;
      continue;
    }

    const result = (await db.query(
      `UPDATE matches
        SET espn_id = ?
        WHERE id_home_team = ?
        AND id_away_team = ?
        AND week = ?
        AND id_season = ?`,
      [row.espn_id, homeTeamId, awayTeamId, week, SEASON_ID]
    )) as { affectedRows: number };

    if (result.affectedRows === 0) {
      console.warn(`No match found for ESPN event ${row.espn_id} (week ${week.toString()}).`);
      skipped++;
      continue;
    }

    updated++;
  }

  console.log(`Done. Updated ${updated.toString()} match(es), skipped ${skipped.toString()}.`);
}

run()
  .catch((error: unknown) => {
    console.error('Failed to update match ESPN ids:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void connection.end();
  });

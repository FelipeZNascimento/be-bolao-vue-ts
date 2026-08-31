/// <reference types="node" />
/**
 * Fetches ESPN scoreboard data for a given week and extracts each event's ESPN id along with
 * its home/away competitor ids, writing the result to a CSV file for manual DB reconciliation.
 *
 * Usage: tsx scripts/fetchEspnMatchIds.ts <week>
 * Example: tsx scripts/fetchEspnMatchIds.ts 1
 */
import { writeFile } from 'node:fs/promises';

interface IEspnCompetitor {
  homeAway: 'away' | 'home';
  id: string;
}

interface IEspnCompetition {
  competitors: IEspnCompetitor[];
}

interface IEspnEvent {
  competitions: IEspnCompetition[];
  id: string;
}

interface IEspnScoreboardResponse {
  events: IEspnEvent[];
}

interface IMatchRow {
  espn_id: string;
  id_away_team: string;
  id_home_team: string;
  week: number;
}

async function run() {
  const weekArg = process.argv[2];
  if (!weekArg || Number.isNaN(parseInt(weekArg))) {
    throw new Error('Usage: tsx scripts/fetchEspnMatchIds.ts <week>');
  }
  const week = parseInt(weekArg);

  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}`);

  if (!response.ok) {
    throw new Error(`ESPN request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as IEspnScoreboardResponse;

  const rows: IMatchRow[] = data.events.map((event) => {
    const competitors = event.competitions[0]?.competitors ?? [];
    const homeTeam = competitors.find((competitor) => competitor.homeAway === 'home');
    const awayTeam = competitors.find((competitor) => competitor.homeAway === 'away');

    if (!homeTeam || !awayTeam) {
      throw new Error(`Event ${event.id} is missing a home or away competitor.`);
    }

    return {
      espn_id: event.id,
      id_away_team: awayTeam.id,
      id_home_team: homeTeam.id,
      week: week
    };
  });

  const header = 'espn_id,id_home_team,id_away_team,week';
  const lines = rows.map((row) => `${row.espn_id},${row.id_home_team},${row.id_away_team},${row.week}`);
  const csv = [header, ...lines].join('\n') + '\n';

  const outputPath = `scripts/output/espn-match-ids-week-${week}.csv`;
  await writeFile(outputPath, csv, 'utf-8');

  console.log(`Done. Wrote ${rows.length.toString()} row(s) to ${outputPath}.`);
}

run().catch((error: unknown) => {
  console.error('Failed to fetch ESPN match ids:', error);
  process.exitCode = 1;
});

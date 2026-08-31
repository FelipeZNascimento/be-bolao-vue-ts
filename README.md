# be-bolao-vue-ts

Bolao BE in NodeJS with TypeScript and Express — a backend API for an NFL betting pool/prediction game.

## Features

- Betting system for NFL matches and extra season predictions
- Real-time updates via WebSocket for live matches and rankings
- Weekly and season-long ranking/leaderboard calculations
- Session-based user authentication with MySQL session store
- Cached team and match data for performance

## Tech Stack

- **Runtime**: Node.js 23.7.0, TypeScript
- **Framework**: Express 5
- **Database**: MySQL2
- **Real-time**: WebSocket (`ws`, `websocket-express`)
- **Validation**: Zod
- **Email**: Nodemailer
- **Caching**: node-cache
- **Testing**: Vitest
- **Linting/Formatting**: oxlint + oxfmt, Husky + lint-staged

## Project Structure

```
src/
├── app.ts          # Express app setup
├── index.ts        # Entry point
├── bet/            # Betting logic
├── database/       # DB connection/config
├── mailer/         # Email notifications
├── match/          # Match data
├── middlewares/     # Express middlewares
├── ranking/        # Ranking/leaderboard logic
├── season/         # Season predictions
├── shared/         # Shared utilities/types
├── team/           # Team data
├── user/           # User management/auth
├── utils/          # General utilities
└── websocket/      # WebSocket handling
```

Path aliases use `#*` to reference files under `src/*`.

## Getting Started

### Prerequisites

- Node.js 23.7.0
- pnpm
- MySQL database
- A `.env` file with the required environment variables

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build & Run

```bash
pnpm build
pnpm start
```

### Production (PM2)

```bash
pnpm start:prod
```

## Scripts

| Script                                  | Description                                            |
| --------------------------------------- | ------------------------------------------------------ |
| `pnpm dev`                              | Run in watch mode with `tsx`                           |
| `pnpm build`                            | Compile TypeScript to `dist/`                          |
| `pnpm start`                            | Run the built app                                      |
| `pnpm start:prod`                       | Run with PM2 in production                             |
| `pnpm test`                             | Run tests with Vitest (watch mode)                     |
| `pnpm test:run`                         | Run tests once                                         |
| `pnpm test:ui`                          | Run tests with Vitest UI                               |
| `pnpm coverage`                         | Run tests with coverage report                         |
| `pnpm type-check`                       | Type-check without emitting files                      |
| `pnpm lint`                             | Lint the codebase                                      |
| `pnpm lint:fix`                         | Lint and auto-fix issues                               |
| `pnpm format`                           | Format code with Prettier                              |
| `pnpm format:check`                     | Check formatting without writing changes               |
| `pnpm season:populate-ranking <season>` | Populate `season_ranking` table for a completed season |

## End of the Season

Once a season is fully completed (all matches locked), populate the `season_ranking` table
with that season's final, static ranking. This lets endpoints like `GET /user/records/:userId`
read historical rankings from the table instead of recalculating them from raw matches/bets
on every request.

```bash
pnpm season:populate-ranking <season>
# Example: pnpm season:populate-ranking 13
```

Notes:

- The script aborts without writing anything if the season has no matches or isn't fully locked yet.
- Safe to re-run: rows are upserted (`INSERT ... ON DUPLICATE KEY UPDATE`) keyed by `(id_season, id_user)`.
- Requires the `season_ranking` table (columns: `id_season`, `id_user`, `points`, `bullseye`,
  `winner`, `total_bets`, `total_games`, `position`, `total_participants`, `extras`).

## ESPN Match Id Sync

Two scripts help reconcile local `matches` with ESPN's own event ids, stored in `matches.espn_id`.

### 1. Fetch ESPN match ids for a week

```bash
npx tsx scripts/fetchEspnMatchIds.ts <week>
# Example: npx tsx scripts/fetchEspnMatchIds.ts 1
```

Fetches ESPN's scoreboard for the given week and writes a CSV to
`scripts/output/espn-match-ids-week-<week>.csv` with columns `espn_id,id_home_team,id_away_team,week`.
Note `id_home_team`/`id_away_team` here are ESPN's own team ids, not local DB ids. No `.env`/DB access needed.

### 2. Update `matches.espn_id` from the CSV

```bash
npx tsx --env-file .env scripts/updateMatchEspnIds.ts <csvPath>
# Example: npx tsx --env-file .env scripts/updateMatchEspnIds.ts scripts/output/espn-match-ids-week-1.csv
```

Reads the CSV, resolves each ESPN team id to a local team via `teams.espn_id`, then updates
`matches.espn_id` where `id_home_team`, `id_away_team`, `week`, and `id_season = 14` match.
Rows that can't be resolved or that match zero DB rows are logged and skipped (not treated as errors).

## License

MIT

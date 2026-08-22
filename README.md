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

## License

MIT

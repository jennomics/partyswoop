# PartySwoop

Party request management with near-real-time updates via polling. Guests scan a QR code, request drinks, supplies, or songs, and track their request status. Hosts manage the menu, view requests by category, track inventory, and mark requests done. No accounts, no logins, no installs.

## Features

- **QR code entry** - Guests scan a code to join the party instantly
- **Near-real-time updates** - 3-second polling keeps all clients in sync
- **Request categories** - Drinks, supplies, and songs each have dedicated flows
- **Inventory tracking** - Hosts set quantities and low-stock thresholds per item
- **AI fridge scan** - Photograph your fridge and let OpenAI Vision generate the drink menu
- **Location tagging** - Create named zones (patio, kitchen) with unique QR codes for delivery routing
- **Auto-expiry** - Parties expire after 24 hours with no cleanup required
- **Audio alerts** - Hosts receive a sound notification when new requests arrive
- **Rate limiting** - D1-backed rate limits prevent abuse (party creation, scans, requests)

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS |
| Runtime | Cloudflare Workers via @opennextjs/cloudflare |
| AI | OpenAI Vision API |
| QR codes | qrcode (Node) |

## Design philosophy

The interface follows a principle called "One filled thing" - a quiet, ADHD-friendly UI where only the single most important element on screen carries a filled background. Everything else recedes into borders and whitespace. Zero border radius, no drop shadows, minimal color.

**Fonts:** Zen Kaku Gothic New (body) + DM Mono (metadata)

**Palette:**

| Token | Hex | Role |
|-------|-----|------|
| Paper | `#F6F5F1` | Page background |
| Rule | `#E6E4DC` | Borders and dividers |
| Live | `#A8512C` | Active state, primary action |
| Ink | `#1C1C1A` | Text |

## Getting started

### Prerequisites

- Node.js 22+
- npm

### Local development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start the development server (uses D1 bindings via OpenNext)
npm run dev
```

The app runs at `http://localhost:3000`.

### Database migrations

Migrations live in `migrations/` and are applied with Wrangler:

```bash
# Apply migrations locally
npm run db:migrate:local

# Apply migrations to remote D1
npm run db:migrate:remote

# Generate a new migration from schema changes
npm run db:generate
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (Next.js) |
| `npm run build:cf` | Build for Cloudflare Workers |
| `npm run preview` | Build and preview Cloudflare Workers locally |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests with Vitest |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate:remote` | Apply D1 migrations to production |
| `npm run db:generate` | Generate migration from schema |

## Deployment

PartySwoop deploys to Cloudflare Workers using the OpenNext adapter.

```bash
# Build for Cloudflare
npm run build:cf

# Deploy
npm run deploy
```

A GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on every push to `main`: lint, test, apply D1 migrations, build, and deploy.

### Required secrets and variables

| Name | Type | Description |
|------|------|-------------|
| `CLOUDFLARE_API_TOKEN` | Secret | Cloudflare API token with Workers and D1 permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | Your Cloudflare account ID |
| `DEPLOY_URL` | Variable | (Optional) Production URL for health check |

## Environment variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for the fridge scan feature (optional) |
| `NEXT_PUBLIC_BASE_URL` | Public base URL for QR code generation |

D1 database configuration lives in `wrangler.toml`, not in environment variables.

## Project structure

```
src/
  app/
    api/          # API routes (parties, requests, health)
    host/         # Host dashboard (manage menu, view requests)
    party/        # Guest interface (browse menu, make requests)
    layout.tsx    # Root layout with fonts and global styles
    page.tsx      # Landing / party creation
  components/
    host/         # Host-specific components (menu, queue, QR, fridge scan)
    guest/        # Guest-specific components (request forms, trackers)
    ui/           # Shared UI primitives
  hooks/          # Custom hooks (polling, audio alerts)
  lib/            # Core utilities (schema, DB, validation, rate limiting, AI)
migrations/       # D1 SQL migration files
```

## License

MIT

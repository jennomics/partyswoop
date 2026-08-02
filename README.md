# PartySwoop

Real-time party request management. Guests scan a QR code, request drinks, supplies, or songs, and track their request status live. Hosts manage the menu, view requests by category, track inventory, and mark requests done. No accounts, no logins, no installs.

## Features

- **QR code entry** - Guests scan a code to join the party instantly
- **Real-time updates** - Server-Sent Events push status changes to all connected clients
- **Request categories** - Drinks, supplies, and songs each have dedicated flows
- **Inventory tracking** - Hosts set quantities and low-stock thresholds per item
- **AI fridge scan** - Photograph your fridge and let OpenAI Vision generate the drink menu
- **Location tagging** - Create named zones (patio, kitchen) with unique QR codes for delivery routing
- **Auto-expiry** - Parties expire after 24 hours with no cleanup required
- **Audio alerts** - Hosts receive a sound notification when new requests arrive

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS |
| Runtime | Cloudflare Workers via @opennextjs/cloudflare |
| Real-time | Server-Sent Events (SSE) |
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

# Start the development server
npm run dev
```

The app runs at `http://localhost:3000`.

### Database migrations

Migrations live in `migrations/` and are applied with Wrangler:

```bash
# Generate a new migration from schema changes
npm run db:generate

# Apply migrations to D1
npm run db:migrate
```

For local development, Next.js uses D1 bindings through the Cloudflare Workers runtime.

## Deployment

PartySwoop deploys to Cloudflare Workers using the OpenNext adapter.

```bash
# Build for Cloudflare
npm run build:cf

# Deploy
npm run deploy
```

A GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on every push to `main`, building and deploying automatically.

### Required secrets and variables

| Name | Type | Description |
|------|------|-------------|
| `CLOUDFLARE_API_TOKEN` | Secret | Cloudflare API token with Workers and D1 permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | Your Cloudflare account ID |

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Database connection (used by Drizzle Kit for migrations) |
| `OPENAI_API_KEY` | OpenAI API key for the fridge scan feature |
| `NEXT_PUBLIC_BASE_URL` | Public base URL for QR code generation |

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
  hooks/          # Custom hooks (SSE, audio alerts)
  lib/            # Core utilities (schema, DB, validation, SSE, AI)
migrations/       # D1 SQL migration files
```

## License

MIT

# Groundcrew Integration

## Overview

This project is managed locally by [groundcrew](https://github.com/jennomics/groundcrew), a CLI agent that watches for git changes and Kiro commands. The user does not run terminal commands manually.

## How It Works

```
Kiro (cloud) --> pushes code to GitHub --> groundcrew (local) polls & auto-pulls
                                       --> groundcrew runs post-pull tasks
                                       --> groundcrew exposes localhost via cloudflared tunnel
                                       --> Kiro reads tunnel URL from .kiro/tunnel-url.txt
```

## Starting Groundcrew

The user runs groundcrew locally with:

```bash
groundcrew start ~/path/to/partyswoop
```

Groundcrew then:
1. Polls the git remote every 5 seconds for new commits
2. Auto-pulls (stashes local changes first)
3. Runs post-pull tasks based on changed files
4. Watches `.kiro/agent-commands.json` for explicit commands
5. Manages the dev server lifecycle (`npm run dev` on port 3000)
6. Starts a cloudflared tunnel (if installed) and writes URL to `.kiro/tunnel-url.txt`

## Post-Pull Tasks (automatic)

When groundcrew detects new commits, it inspects which files changed:

| Changed File | Auto Action |
|---|---|
| `package.json` | `npm install` |
| `prisma/schema.prisma` or `prisma/migrations/*` | `npx prisma generate` + `npx prisma db push --accept-data-loss` |
| Any `.ts`, `.tsx`, `.js`, `.json`, `.css`, `.env`, or prisma file | Restart dev server |

**Note:** This is a PostgreSQL project. Unlike SQLite projects, there is no database file to `chmod`. The database runs as a Docker container (see docker-compose.yml) or as an external service.

## Sending Commands to Groundcrew

To run commands on the user's machine, write to `.kiro/agent-commands.json`:

```json
{
  "commands": [
    {
      "id": "unique-id",
      "command": "npx prisma db push",
      "description": "Sync database schema with latest changes"
    }
  ],
  "createdAt": "2026-07-30T12:00:00Z",
  "source": "kiro"
}
```

Commit and push this file. Groundcrew will detect the change, execute the commands, and push results back to `.kiro/agent-results.json`.

### Command Format

```typescript
interface AgentCommand {
  id: string;          // Unique identifier
  command: string;     // Shell command to execute
  description?: string; // Human-readable description
  cwd?: string;        // Working directory (relative to project root)
  retries?: number;    // Number of retries on failure
  timeout?: number;    // Timeout in ms (default: 120000)
}
```

## Reading Results

After execution, groundcrew writes to `.kiro/agent-results.json`:

```json
{
  "results": [
    {
      "id": "unique-id",
      "command": "npx prisma db push",
      "status": "success",
      "stdout": "...",
      "stderr": "...",
      "exitCode": 0,
      "duration": 3500
    }
  ],
  "processedAt": "2026-07-30T12:00:05Z"
}
```

Pull the repo to read the results.

## Accessing the Dev Server

Groundcrew starts a cloudflared tunnel that exposes `localhost:3000`. The public URL is written to `.kiro/tunnel-url.txt`:

```json
{
  "url": "https://random-words.trycloudflare.com",
  "startedAt": "2026-07-30T12:00:00Z",
  "host": "users-machine.local"
}
```

Use this URL to access the running application remotely.

## Prerequisites on the User's Machine

- Docker running (for PostgreSQL via `docker-compose up -d db`)
- Node.js and npm installed
- groundcrew installed globally (`npm link` from groundcrew repo)
- cloudflared installed (optional, for tunnel: `brew install cloudflared`)
- `.env` file configured (see `.env.example`)

## Project-Specific Notes

- **Port:** 3000 (Next.js default)
- **Dev command:** `npm run dev`
- **Database:** PostgreSQL (via Docker Compose or external)
- **DATABASE_URL:** `postgresql://partyswoop:partyswoop@localhost:5432/partyswoop`
- **Schema sync:** `npx prisma generate` + `npx prisma db push`
- **No SQLite:** Do not attempt `chmod` on database files

## Safety

Groundcrew blocks destructive commands by default:
- `rm -rf`, `rm --force`
- `git reset --hard`, `git push --force`
- `drop database`, `truncate`
- `sudo rm`, `shutdown`, `reboot`
- Piping curl to bash

The user runs with safety filter OFF (`--no-confirm` flag not needed; it defaults to allowed unless `--safe-mode` is passed).

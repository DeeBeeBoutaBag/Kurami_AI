# Architecture

Kurami.AI is a TypeScript monorepo with shared contracts between the web app, server, tests, and seed data.

## Packages

- `packages/shared`: workshop constants, rotation schedule, Zod schemas, Socket.IO event types, scoring, assignment, locking, moderation, badge, timer, and fallback-story logic.
- `packages/ui`: small reusable React primitives for buttons, surfaces, labels, status pills, and empty states.
- `apps/server`: Express API, Socket.IO server, Redis-ready live state, AI service, facilitator auth, workshop state, moderation, and graceful shutdown.
- `apps/web`: React participant and facilitator experience.
- `prisma`: PostgreSQL schema and seed script.

## Data Flow

Participants join with event code and nickname. The server assigns group, team, Who's Who room, and anonymous session. The server remains authoritative for rotations, workshop locks, timers, announcements, votes, and reveal states.

Realtime events update clients through Socket.IO:

- event state
- timer updates
- announcements
- room updates
- vote results
- workshop lock/unlock
- fallback mode
- story generation status

## Persistence Strategy

Prisma defines the production PostgreSQL schema. Local development can use an in-memory fallback when PostgreSQL or Redis are not configured. Production deployments should set `DATABASE_URL`, run migrations, and seed the event before students join.

Redis-compatible live state is abstracted through `LiveState`; Render Key Value is the target.

## AI Strategy

OpenAI calls are centralized in `AIService`. The frontend never sees the key. The queue limits concurrency, caches repeatable prompts, and falls back to deterministic content when no API key is configured or generation fails.

Data-Detective and Kurami Court are seeded by design so the event remains reliable without AI.

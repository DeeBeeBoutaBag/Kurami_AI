# Kurami.AI

Kurami.AI is a realtime workshop platform for a four-room Responsible AI event. Students rotate through interactive workshops where they investigate, debate, create, vote, and explain AI ethics decisions.

- **Who's Who**: 21-seat social deduction about evidence, AI detection, accusations, and fair process.
- **Data-Detective**: investor scavenger hunt where split rooms verify fictional AI business claims with real sources.
- **Storibloom**: collaborative story boardroom with chat, proposals, voting, AI guidance, human edits, and authorship transparency.
- **Kurami Court**: 30-minute whole-class courtroom debate with AI Judge questions, five rounds, and a final vote.

Who's Who, Data-Detective, and Storibloom are 45 minutes. Kurami Court is 30 minutes.

## Technology Stack

- Frontend: React, TypeScript, Vite, React Router, Tailwind CSS, TanStack Query, Zustand, Framer Motion, Socket.IO client.
- Backend: Node.js, TypeScript, Express, Socket.IO, Zod, Helmet, rate limiting, Pino logging.
- Persistence: Prisma schema for PostgreSQL and Redis-compatible live state for Render Key Value.
- AI: OpenAI API through the backend only, with validation, queueing, logging, and deterministic fallbacks.

## Local Setup

```bash
npm install
cp .env.example .env
npm run build
npm run dev
```

The web app runs on `http://localhost:5173`. The server runs on `http://localhost:4000`.

## Production Environment

Required for Render production:

- `DATABASE_URL`
- `REDIS_URL`
- `APP_URL`
- `VITE_API_URL`
- `DEMO_MODE=false`
- `FACILITATOR_PIN`
- `GOLD_FACILITATOR_PIN`
- `BLACK_FACILITATOR_PIN`
- `GREEN_FACILITATOR_PIN`
- `PURPLE_FACILITATOR_PIN`
- `SESSION_SECRET`
- `EVENT_CODE`

Set `OPENAI_API_KEY` on the backend service when live AI generation should be enabled. Never expose it in the frontend.

## Database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

For Render:

```bash
npm run db:migrate
npm run db:seed
```

## Tests

```bash
npm run typecheck
npm run build
npm test
npm run test:e2e
npm run load:test
```

## Facilitator Access

Open `/facilitator/login` and choose a scope:

- **Lead Facilitator** sees all rooms and event-wide controls.
- **Gold Room Facilitator** sees Gold only.
- **Black Room Facilitator** sees Black only.
- **Green Room Facilitator** sees Green only.
- **Purple Room Facilitator** sees Purple only.

Room facilitators can only see their assigned students, readiness, activity, and workshop rooms. In production, give each room its own PIN so a room facilitator cannot select Lead access or another room.

## Room Model

There are four main rooms. Data-Detective and Storibloom split each main room in half.

| Main room | Who's Who | Data-Detective | Storibloom | Kurami Court |
| --- | --- | --- | --- | --- |
| Gold | `gold-alpha` | `venture-north`, `venture-south` | `bloom-alpha`, `bloom-bravo` | `court-alpha` |
| Black | `black-alpha` | `venture-east`, `venture-west` | `bloom-charlie`, `bloom-delta` | `court-bravo` |
| Green | `green-alpha` | `venture-ne`, `venture-nw` | `bloom-echo`, `bloom-foxtrot` | `court-charlie` |
| Purple | `purple-alpha` | `venture-se`, `venture-sw` | `bloom-golf`, `bloom-hotel` | `court-delta` |

## Render Deployment

`render.yaml` defines:

- Node web service for `apps/server`
- Static site for `apps/web`
- PostgreSQL database
- Render Key Value instance

Before event day:

1. Create Render services from `render.yaml`.
2. Set production environment variables, including unique lead and room facilitator PINs.
3. Confirm `DEMO_MODE=false`.
4. Run migrations and seed data.
5. Confirm `/health` and `/ready`.
6. Test lead and room facilitator logins.
7. Run the load test against the Render backend.

## Event Documents

- `docs/codes-and-steps.md`: production codes, room map, facilitator steps, and student steps.
- `docs/facilitator-guide.md`: room-scope dashboard guide and facilitator operating notes.
- `docs/workshop-explainers.md`: what each workshop is, why it relates to AI ethics, and what students learn.
- `docs/manual-fallback-guide.md`: paper-based versions of every workshop if the website or internet fails.
- `docs/event-day-checklist.md`: production readiness checklist.
- `docs/production-risks.md`: final risks, missing items, and live-event watchouts.

## Data Deletion

The server exposes facilitator-authorized deletion for participant, team, story, vote, workshop, or full event data. See `docs/privacy-and-safety.md`.

## Troubleshooting

- If OpenAI is slow or unavailable, enable fallback mode.
- If Wi-Fi drops, participants can rejoin from the same browser with their session restored.
- If projection fails, use room facilitator dashboards on laptops and the manual fallback guide.
- If a room facilitator sees the wrong room, log out and log back in with the correct scope.

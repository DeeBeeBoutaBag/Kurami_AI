# Architecture Summary

Kurami.AI is a realtime workshop platform for approximately 80 participants rotating through four interactive workshop worlds. The implementation uses a TypeScript monorepo so shared event rules, validation, Socket.IO contracts, and workshop content remain consistent between frontend, backend, tests, and seed data.

## System Shape

```text
responsible-ai-lab/
  apps/
    web/       React, Vite, Tailwind, Router, TanStack Query, Zustand, Socket.IO client
    server/    Express, Socket.IO, OpenAI backend service, Prisma, Redis-compatible live state
  packages/
    shared/    Workshop constants, schemas, typed socket events, scoring and assignment logic
    ui/        Small reusable design primitives shared by web surfaces
  prisma/      PostgreSQL schema and seed script
  load/        Artillery event load test
  docs/        Operator, architecture, safety, and deployment documentation
```

## Runtime Responsibilities

- **React web app** owns participant and facilitator interaction, local drafts, connection indicators, low-bandwidth rendering, and accessible touch-friendly controls.
- **Express API** owns authentication, event state, participant/session creation, persistence actions, moderation, AI requests, audit logging, and deletion flows.
- **Socket.IO** delivers authoritative event state, rotation changes, timers, announcements, vote results, room updates, generation status, and fallback notifications.
- **PostgreSQL via Prisma** stores durable event configuration, participants, teams, workshop progress, submissions, votes, stories, charter proposals, moderation records, AI request logs, and audit events.
- **Redis-compatible storage** stores live room state, queue state, socket synchronization, vote broadcasts, timer ticks, and reconnect metadata. Render Key Value is the production target.
- **OpenAI integration** lives only in the backend behind validation, moderation, queueing, logging, rate limits, retry logic, and deterministic fallbacks.

## Event Model

The event contains four rotation groups: Gold, Black, Green, and Purple. Each group progresses through the required workshop rotation table. The server is authoritative for the current rotation and portal lock state, so participants cannot enter future workshops unless a facilitator manually unlocks them.

Most active workshop rotations are governed by a shared `WORKSHOP_DURATION_MINUTES` constant set to 45 minutes. Kurami Court has a separate 30-minute courtroom clock with five debate rounds and a final vote window. The welcome and closing blocks are timed separately.

Participants join anonymously with an event code and nickname. The server creates an anonymous session, normalizes duplicate nicknames inside the event (`Nova`, `Nova 2`), assigns the least-full rotation group, assigns a team, and returns the current event state. No email, phone number, legal name, address, or social account is required.

## Workshop Worlds

- **Who's Who** uses anonymous identities, three AI personas per room, shuffled response display, suspicion voting, final accusations, confidence/evidence tracking, accessible reveals, and an ethics debrief about transparency and false accusations.
- **Data-Detective** uses eight facilitator-assigned investor rooms (`venture-north`, `venture-south`, `venture-east`, `venture-west`, `venture-ne`, `venture-nw`, `venture-se`, and `venture-sw`) with fictional AI businesses, built-in dossier documents, internet source capture, shared claim boards, room discussion, final investor claims, fund/reject votes, and live projection.
- **Storibloom** uses eight facilitator-started story rooms (`bloom-alpha` through `bloom-hotel`) with lobby join, automatic 45-minute six-stage pacing, boardroom chat, idea proposals, approve/rework voting, room-wide and personal Kurami Guide help, draft generation from approved ideas, human editing, authorship notes, and gallery artifacts.
- **Kurami Court** uses four whole-class courtrooms (`court-alpha` through `court-delta`) with facilitator start/advance controls, 30-minute AI Judge pacing, five debate rounds, a sealed Round 3 detail, student argument records, judge follow-up questions based on student input, final class voting, and live projection.

## Safety And Privacy

The app intentionally models responsible AI practice:

- Minimal anonymous participant data.
- Sensitive-information reminders next to text inputs.
- Moderation for profanity, threats, hate/harassment, sexual content, personal information, prompt extraction, and AI misuse.
- Human facilitator controls for AI generation, publication, voting, unlocking, and deletion.
- Fallback mode for OpenAI failure.
- No real high-impact automated decisions about participants.
- No facial recognition, emotion detection, hidden profiling, or sensitive story collection.

## Deployment

Render runs the server as a Node web service and the web app as a static site. PostgreSQL and Render Key Value are configured through environment variables. The server exposes `/health` and `/ready`, handles graceful shutdown, and keeps frontend secrets out of client bundles.

## Development Mode

For local exploration, the server can run with an in-memory event store if PostgreSQL/Redis are not configured. This keeps the workshop explorable on one laptop while preserving the production schema, migration, and deployment path.

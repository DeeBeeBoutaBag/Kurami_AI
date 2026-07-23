# Kurami.AI Implementation Checklist

This checklist tracks the build in the same phased order as the workshop brief. It is intentionally practical: each item maps to code, configuration, tests, or event-day operations in this repository.

## Phase 1: Platform Foundation

- [x] Create TypeScript monorepo with `apps/web`, `apps/server`, `packages/shared`, and `packages/ui`.
- [x] Add shared workshop constants, rotation schedule, validation schemas, scoring helpers, and typed Socket.IO contracts.
- [x] Centralize the rule that each workshop rotation lasts 45 minutes and surface it in participant/facilitator UI.
- [x] Add Prisma PostgreSQL schema covering event, participant, workshop, moderation, AI, voting, story, and charter data.
- [x] Add seed script for the default `ETHICS2026` event.
- [x] Add Express + Socket.IO server with health checks, validation, rate limiting, CORS, structured logging, and graceful shutdown.
- [x] Add Redis-ready live-state layer with an in-memory development fallback.
- [x] Add participant join flow at `/join` with anonymous session creation, duplicate nickname handling, group assignment, team assignment, and responsible-use agreement.
- [x] Add participant hub at `/hub` with current rotation, team, badges, portal locking, announcements, timer, and connection status.
- [x] Add facilitator login and dashboard shell at `/facilitator` with event controls, announcement broadcasts, lock/unlock controls, fallback mode, leaderboard toggle, and system status.
- [x] Add Render deployment configuration, environment documentation, and production scripts.

## Phase 2: Who's Who

- [x] Add AI persona definitions, prompt bank, room model, anonymous identities, fallback AI response bank, voting flow, reveal view, debrief copy, and configurable scoring rules.
- [x] Add participant room UI with response submission, suspicion voting, final vote support, confidence/evidence capture, reveal, and ethics debrief.
- [x] Add facilitator controls for prompt selection, round state, AI response regeneration, voting, reveal, and reset.
- [x] Add investigation lenses, assumption tagging, counter-evidence capture, recent reasoning wall, debrief prompts, and facilitator-controlled next rounds.
- [ ] Add deeper automated integration coverage for multi-room reconnect/reveal edge cases.

## Phase 3: Data-Detective

- [x] Add eight investor scavenger-hunt rooms: `venture-north` for BrightCart AI, `venture-south` for CareRoute AI, `venture-east` for GreenGrid AI, `venture-west` for SkillBridge AI, `venture-ne` for LearnLoop AI, `venture-nw` for CivicSignal AI, `venture-se` for FarmSense AI, and `venture-sw` for LoanLift AI.
- [x] Add room joining, business dossiers, built-in documents, internet source capture, shared claim board, room discussion, final investor claims, fund/reject votes, and live projection.
- [x] Add facilitator room visibility for member counts, claim counts, vote totals, room IDs, and projection links.
- [ ] Add richer chart snapshots and keyboard shortcuts for dossier navigation.

## Phase 4: Storibloom

- [x] Add eight facilitator-started Storibloom rooms with lobby join, automatic six-stage pacing, boardroom chat, proposal voting, Kurami Guide help, human edit tracking, authorship statement, moderation flags, final story save, and gallery artifacts.
- [x] Add fallback deterministic story assembly for OpenAI outages.
- [x] Add stage-specific creative prompts, ethics checkpoint toggles, human-edit requirements, weak-AI-choice capture, human detail capture, and ending revision notes.
- [ ] Add collaborative cursor/presence details for simultaneous team editing.

## Phase 5: Kurami Court

- [x] Add four whole-class courtrooms with facilitator room IDs, lobby join, room reset, start, next-round, final-vote, end, and projection controls.
- [x] Add 30-minute courtroom pacing with five 5-minute AI Judge debate rounds, sealed Round 3 evidence, final vote window, and live vote breakdown.
- [x] Add student argument records with stance, stakeholder, evidence, judge follow-up questions based on student input, and final approve/restrict/reject/more-info voting.
- [x] Add projector-specific Kurami Court display mode for large room screens.

## Phase 6: Responsible Event Layer

- [x] Add shared points, badges, leaderboard modes, low-bandwidth mode, fallback mode, moderation layer, privacy notice, deletion endpoint, audit logging hooks, and closing reflection.
- [x] Add participant reminders near text inputs not to enter sensitive personal information.
- [ ] Add facilitator-export CSV/PDF polish after a real rehearsal confirms desired output format.

## Phase 7: Verification And Operations

- [x] Add unit tests for rotation assignment, scoring, moderation, timers, badges, and vote calculations.
- [x] Add Playwright end-to-end smoke test for join, hub, facilitator, and one workshop route.
- [x] Add Artillery load-test script for 100 connected participants, joining, voting, announcements, rotation change, reconnects, and AI queue pressure.
- [x] Add documentation: README, architecture, socket events, facilitator guide, event-day checklist, privacy/safety, and load testing.
- [ ] Run full Render rehearsal against production PostgreSQL and Render Key Value.
- [ ] Run venue Wi-Fi load test with backup hotspot before event day.

## Current Risk Notes

- OpenAI is isolated behind the backend and has deterministic fallbacks, but live model quality and spending limits must be tested with the actual event key.
- The local development path can run in memory when PostgreSQL or Redis are absent; production should run migrations and seed data before the event.
- Load-test numbers are only meaningful against the deployed Render services and venue network.

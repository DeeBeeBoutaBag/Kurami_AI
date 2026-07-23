# Production Risks And Missing Items

Use this as the final pre-event risk list.

## Must Verify On Render

- `/ready` must report no production readiness issues.
- `FACILITATOR_PIN` and all four room PINs must be set, private, unique, and at least 6 characters.
- `APP_URL` and `VITE_API_URL` must resolve to the deployed Render services.
- PostgreSQL migrations and seed data must run successfully before students join.
- Redis or Render Key Value must be available for live-state health.
- OpenAI billing and limits must be confirmed if live AI generation is enabled.

## Operational Risks

- Kurami Court is 30 minutes while the other workshops are 45 minutes. Plan a 15-minute debrief, charter-writing, or transition buffer when a room finishes Court inside a 45-minute rotation block.
- Data-Detective depends on students reaching reputable internet sources. Print the manual evidence cards in `docs/manual-fallback-guide.md` in case the venue blocks search or Wi-Fi slows down.
- Shared devices can restore a previous browser session. Use one device per student when possible, or clear browser storage before a new event.
- Projectors should avoid showing facilitator dashboards with private controls. Use `/display`, `/display/live`, or room projection routes for public screens.
- AI outputs may be wrong, generic, or biased. Facilitators should keep fallback mode available and frame AI as a guide, not an authority.

## Technical Risks

- The production web build currently reports a Vite chunk-size warning because the main bundle is larger than 500 kB. It builds successfully, but future polish should add route-level code splitting.
- Load tests should be run against Render and the venue network. Local tests do not prove the live Wi-Fi can handle the room.
- The app has strong room scoping after login, but the separation depends on using unique room PINs. Do not share the lead PIN with room facilitators.
- Data export is JSON. Add CSV/PDF export later if the final audience needs a more polished artifact packet.

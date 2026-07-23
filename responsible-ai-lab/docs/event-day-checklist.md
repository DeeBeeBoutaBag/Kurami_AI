# Event-Day Checklist

## Production Health

- [ ] Render backend is awake.
- [ ] `/health` returns ok.
- [ ] `/ready` returns ok.
- [ ] `/ready` reports no production readiness issues.
- [ ] `DEMO_MODE=false`.
- [ ] PostgreSQL connection is healthy.
- [ ] Redis or Render Key Value connection is healthy.
- [ ] OpenAI API key works from the backend only, or fallback mode is planned.
- [ ] OpenAI spending limit is configured.
- [ ] `APP_URL` and `VITE_API_URL` point to the deployed Render URLs.

## Room Readiness

- [ ] Public event code is visible in all four rooms.
- [ ] QR join screen works at `/display`.
- [ ] Lead facilitator can log in as **Lead Facilitator**.
- [ ] Gold facilitator can log in as **Gold Room Facilitator** and only sees Gold.
- [ ] Black facilitator can log in as **Black Room Facilitator** and only sees Black.
- [ ] Green facilitator can log in as **Green Room Facilitator** and only sees Green.
- [ ] Purple facilitator can log in as **Purple Room Facilitator** and only sees Purple.
- [ ] Lead facilitator PIN is private.
- [ ] Room facilitator PINs are private, unique, and different from the lead PIN.
- [ ] Projector or shared screen works in each room.
- [ ] Backup hotspot is ready.
- [ ] Venue Wi-Fi has been tested with participant devices.

## Workshop Materials

- [ ] `docs/codes-and-steps.md` is open or printed.
- [ ] `docs/workshop-explainers.md` is open or printed.
- [ ] `docs/manual-fallback-guide.md` is open or printed.
- [ ] `docs/production-risks.md` has been reviewed by the lead facilitator.
- [ ] Room ID cards are printed for all four main rooms.
- [ ] Data-Detective split room IDs are printed.
- [ ] Storibloom split room IDs are printed.
- [ ] Manual fallback materials are printed: index cards, role cards, claim sheets, story proposal slips, court vote slips.

## Timing

- [ ] Who's Who facilitators know the 45-minute Day/Night flow.
- [ ] Data-Detective facilitators know the 45-minute investor flow.
- [ ] Storibloom facilitators know the 45-minute stage flow.
- [ ] Kurami Court facilitators know the 30-minute, five-round debate flow.
- [ ] Lead facilitator knows when to advance rotations.
- [ ] Room facilitators know when to call for Force Start or fallback mode.

## Student Safety

- [ ] Students are told nicknames are optional.
- [ ] Students are told not to enter private, identifying, medical, financial, or sensitive personal information.
- [ ] Facilitators know how to pause, redirect, and report moderation concerns.
- [ ] Data deletion or retention plan is confirmed.

## Final Check

- [ ] Load test has passed against deployed services.
- [ ] Browser compatibility has been checked on laptops, tablets, Chromebooks, and phones.
- [ ] At least one full rehearsal has been completed with one lead facilitator and one room facilitator login.

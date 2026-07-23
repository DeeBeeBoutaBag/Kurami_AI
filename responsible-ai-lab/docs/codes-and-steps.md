# Kurami.AI Codes and Steps

Use this runbook for production setup, facilitator briefing, student onboarding, and room movement. Who's Who, Data-Detective, and Storibloom are 45 minutes. Kurami Court is a 30-minute whole-class hearing.

## Core Codes

| Purpose | Value | Who sees it | Notes |
| --- | --- | --- | --- |
| Public event code | Set in `EVENT_CODE` | Students and facilitators | Put the final code on slides, signs, and facilitator notes. |
| Lead facilitator PIN | Set in `FACILITATOR_PIN` | Lead facilitator only | Share privately. Use a private 6+ character value in production. |
| Gold room PIN | Set in `GOLD_FACILITATOR_PIN` | Gold facilitator only | Must be different from the lead PIN and other room PINs. |
| Black room PIN | Set in `BLACK_FACILITATOR_PIN` | Black facilitator only | Must be different from the lead PIN and other room PINs. |
| Green room PIN | Set in `GREEN_FACILITATOR_PIN` | Green facilitator only | Must be different from the lead PIN and other room PINs. |
| Purple room PIN | Set in `PURPLE_FACILITATOR_PIN` | Purple facilitator only | Must be different from the lead PIN and other room PINs. |
| Student join URL | `/join` | Students | Show on the QR display at `/display`. |
| Lead dashboard | `/facilitator` | Lead facilitator | Lead sees all rooms and event-wide controls. |
| Room facilitator dashboard | `/facilitator` | Room facilitators | Room facilitators choose Gold, Black, Green, or Purple at login and only see their assigned room data. |
| Live display | `/display/live` | Projector | Shows readiness, timer, progress, and live activity. |
| Summary display | `/display/summary` | Projector | Shows artifacts, votes, stories, charter ideas, and export access. |

## Room Map

There are four overall rooms. Data-Detective and Storibloom split each room in half.

| Main room | Facilitator scope | Rotation group | Who's Who | Data-Detective split rooms | Storibloom split rooms | Kurami Court |
| --- | --- | --- | --- | --- | --- | --- |
| Gold Room | Gold Room Facilitator | Gold | `gold-alpha` | `venture-north`, `venture-south` | `bloom-alpha`, `bloom-bravo` | `court-alpha` |
| Black Room | Black Room Facilitator | Black | `black-alpha` | `venture-east`, `venture-west` | `bloom-charlie`, `bloom-delta` | `court-bravo` |
| Green Room | Green Room Facilitator | Green | `green-alpha` | `venture-ne`, `venture-nw` | `bloom-echo`, `bloom-foxtrot` | `court-charlie` |
| Purple Room | Purple Room Facilitator | Purple | `purple-alpha` | `venture-se`, `venture-sw` | `bloom-golf`, `bloom-hotel` | `court-delta` |

## Production Setup

1. Deploy from `render.yaml`.
2. Set `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `VITE_API_URL`, `EVENT_CODE`, `FACILITATOR_PIN`, `GOLD_FACILITATOR_PIN`, `BLACK_FACILITATOR_PIN`, `GREEN_FACILITATOR_PIN`, `PURPLE_FACILITATOR_PIN`, and `SESSION_SECRET`.
3. Set `DEMO_MODE=false` for the live event.
4. Add `OPENAI_API_KEY` only on the backend service when live AI generation should be enabled.
5. Run `npm run db:migrate` and `npm run db:seed` on the production backend.
6. Open `/health` and confirm it returns `ok: true`.
7. Open `/ready` and confirm production readiness has no issues.
8. Test one lead facilitator login and one room facilitator login before students arrive.

## Lead Facilitator Steps

1. Open `/facilitator/login`.
2. Choose **Lead Facilitator**, enter the private lead PIN, and confirm the dashboard says **All Rooms**.
3. Open `/display` on the projector so students can scan the QR code.
4. Confirm room facilitators can log in with their assigned scope.
5. Start the event when students are seated.
6. Use **Force Start** only when timing, late arrivals, or Wi-Fi would stall the room.
7. Advance rotations from the lead dashboard.
8. Use announcements only for whole-event messages.
9. Use fallback mode if AI or Wi-Fi becomes unreliable.
10. At closing, open `/display/summary`, show artifacts, export results, and follow the privacy deletion plan.

## Room Facilitator Steps

1. Open `/facilitator/login`.
2. Choose your room scope: Gold, Black, Green, or Purple.
3. Enter the private PIN for that room.
4. Confirm the dashboard shows only your room.
5. Give students the room ID for the current workshop.
6. For Data-Detective and Storibloom, split your physical room into the two assigned split rooms.
7. Use the workshop controls for your assigned rooms only.
8. Project the current room when useful:
   - Who's Who: `/display/whos-who/{roomId}`
   - Data-Detective: `/display/data-detective/{roomId}`
   - Storibloom: `/display/storibloom/{roomId}`
   - Kurami Court: `/display/kurami-court/{roomId}`
9. Keep time, encourage participation, and call the lead facilitator for event-wide changes.

## Student Steps

1. Go to `/join`.
2. Enter the public event code.
3. Add a nickname or leave it blank for an automatic Student name.
4. Accept the responsible-use agreement.
5. Go to the hub.
6. Open the workshop named by the room facilitator.
7. Enter the room ID from the facilitator.
8. Participate in the chat, research board, story boardroom, or courtroom debate.
9. Return to the hub when the rotation ends.
10. Do not enter legal names, contact details, medical details, financial details, or sensitive personal stories.

## Workshop Run Steps

### Who's Who

1. Give the main room one Who's Who room ID.
2. Wait until students see random cover names and roles.
3. Click **Start Game**. Empty seats fill with hidden AI classmates until the room has 21 seats.
4. Run Day discussion, then Night accusation.
5. Encourage role powers: Investigator, Archivist, Signal Reader, Skeptic, Protector, Witness, and Strategist.
6. Resolve votes, move to the next Day, or reveal the room for debrief.
7. Debrief evidence, false confidence, and fair process.

### Data-Detective

1. Split the main room into two investor teams using the assigned split room IDs.
2. Students read the fictional business dossier.
3. Students use reputable internet sources to verify claims, risks, market facts, competitors, and safeguards.
4. Students post claims and discuss each other's findings.
5. Students submit final claims and vote **fund** or **reject**.
6. Debrief the strongest source and the biggest unresolved risk.

### Storibloom

1. Split the main room into two boardrooms using the assigned split room IDs.
2. Students join the room lobby.
3. Start each room manually.
4. Students chat, propose ideas, vote approve/rework, and ask Kurami Guide for help.
5. Students build a draft from approved ideas.
6. Students human-edit the story, add an authorship note, and save the final version.
7. Debrief what humans decided and what AI influenced.

### Kurami Court

1. Give the main room one courtroom ID.
2. Students read the case.
3. Start the 30-minute courtroom.
4. Move through five debate rounds.
5. Let the AI Judge ask follow-up questions based on student arguments.
6. Open final vote.
7. Debrief the strongest safeguard, restriction, appeal path, or accountability rule.

## Backup Documents

- Use `docs/workshop-explainers.md` when a facilitator needs plain-English workshop purpose, AI ethics connection, and debrief language.
- Use `docs/manual-fallback-guide.md` if the website, internet, projector, or AI service is unavailable.
- Use `docs/production-risks.md` for the final list of missing items and potential live-event problems to watch.

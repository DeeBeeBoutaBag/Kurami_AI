# Facilitator Guide

Kurami.AI works best when the lead facilitator controls the event clock and each room facilitator focuses only on their room. The app supports this directly: lead login sees all rooms; Gold, Black, Green, and Purple logins see only their assigned room data and controls.

## Before Students Join

1. Confirm `/ready` has no production readiness issues.
2. Confirm `DEMO_MODE=false`.
3. Confirm the public event code, private lead PIN, and private room PINs.
4. Open `/display` on the projector for QR join.
5. Have each room facilitator log in with the correct room scope.
6. Keep `docs/manual-fallback-guide.md` available in case the site, Wi-Fi, or projector fails.

## Facilitator Roles

### Lead Facilitator

The lead facilitator can:

- Start, pause, resume, end, and advance the event.
- Use Force Start if timing or Wi-Fi makes a room uneven.
- Turn fallback mode on or off.
- Broadcast whole-event announcements.
- Unlock or lock workshop portals.
- See all participants, room readiness, activity, and exports.
- Export results at the end.

### Room Facilitator

Room facilitators can:

- See only their assigned room.
- See their room's students, readiness, activity, and workshop progress.
- Start and control their assigned Who's Who, Storibloom, and Kurami Court rooms.
- See their assigned Data-Detective split rooms.
- Project their assigned rooms.

Room facilitators cannot see other rooms and cannot use lead-only event controls.

In production, each room must have its own PIN: `GOLD_FACILITATOR_PIN`, `BLACK_FACILITATOR_PIN`, `GREEN_FACILITATOR_PIN`, and `PURPLE_FACILITATOR_PIN`. These must be different from the lead `FACILITATOR_PIN` and different from each other.

## Room Assignments

| Main room | Scope at login | Who's Who | Data-Detective | Storibloom | Kurami Court |
| --- | --- | --- | --- | --- | --- |
| Gold | Gold Room Facilitator | `gold-alpha` | `venture-north`, `venture-south` | `bloom-alpha`, `bloom-bravo` | `court-alpha` |
| Black | Black Room Facilitator | `black-alpha` | `venture-east`, `venture-west` | `bloom-charlie`, `bloom-delta` | `court-bravo` |
| Green | Green Room Facilitator | `green-alpha` | `venture-ne`, `venture-nw` | `bloom-echo`, `bloom-foxtrot` | `court-charlie` |
| Purple | Purple Room Facilitator | `purple-alpha` | `venture-se`, `venture-sw` | `bloom-golf`, `bloom-hotel` | `court-delta` |

## Timing

- Who's Who: 45 minutes.
- Data-Detective: 45 minutes.
- Storibloom: 45 minutes.
- Kurami Court: 30 minutes.

The lead event timer handles the rotation pace. Room-level workshop timers help with Who's Who, Storibloom, and Kurami Court.

## Workshop Snapshot

### Who's Who

A 21-seat social deduction game about evidence and AI detection. Students get cover names and helpful roles. The facilitator starts the game, moves between Day discussion and Night accusation, resolves votes, and reveals identities for debrief.

### Data-Detective

An investor scavenger hunt. Students investigate a fictional AI business with a dossier, outside research, shared claims, team discussion, final claims, and a fund/reject vote.

### Storibloom

A story boardroom. Students chat, propose ideas, vote approve/rework, ask Kurami Guide for help, build a draft, human-edit it, and save a transparent authorship note.

### Kurami Court

A courtroom debate. Students read a case, answer AI Judge questions, argue through five rounds, and cast a final vote on whether the AI use should be approved, restricted, rejected, or studied further.

Use `docs/workshop-explainers.md` for deeper facilitator language: what each workshop is, why it matters for AI ethics, and what students should learn.

## Projection Links

- QR join screen: `/display`
- Live event screen: `/display/live`
- Who's Who room: `/display/whos-who/{roomId}`
- Data-Detective room: `/display/data-detective/{roomId}`
- Kurami Court room: `/display/kurami-court/{roomId}`
- Event summary: `/display/summary`

## Fallback Mode

Use fallback mode if OpenAI is slow, blocked, or distracting. Who's Who can run with seeded AI identities, Storibloom can use deterministic story support, and Data-Detective and Kurami Court can run from their built-in materials.

If the website itself is unavailable, use `docs/manual-fallback-guide.md`.

## End Of Event

1. Open `/display/summary`.
2. Show the class artifacts: votes, final claims, stories, and charter ideas.
3. Export results from the lead dashboard.
4. Follow the event privacy plan for deletion or retention.

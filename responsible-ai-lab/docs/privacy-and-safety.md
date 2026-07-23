# Privacy And Safety

## Minimal Collection

Participants enter only event code and nickname. The app stores anonymous session ID, group, team, room, points, badges, submissions, votes, and workshop progress.

The app does not require email, phone number, legal name, home address, or social account.

## Participant Reminder

Text inputs show:

> Do not enter private, identifying, medical, financial, or sensitive personal information.

## Moderation

The moderation layer flags:

- profanity
- threats
- hate or harassment
- personal information
- prompt extraction attempts
- misuse attempts

Flagged text is redacted where possible and sent to facilitator review.

## AI Safety

- OpenAI requests happen only on the backend.
- AI features can be disabled.
- Fallback mode keeps workshops running.
- AI outputs are labeled and must be reviewed by humans.
- Storibloom requires human edits and authorship transparency.

## Prohibited Platform Behaviors

- No facial recognition.
- No emotion detection.
- No participant profiling.
- No hidden ranking based on behavior.
- No high-impact decisions about real participants.

## Deletion

Facilitators can delete individual participant data, team data, stories, votes, workshop submissions, or the full event. Production deployments should define a retention schedule before event day.

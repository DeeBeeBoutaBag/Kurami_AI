# Socket Events

The typed Socket.IO contract lives in `packages/shared/src/socket.ts`.

## Client To Server

- `participant:join`
- `participant:reconnect`
- `room:join`
- `room:leave`
- `response:submit`
- `vote:submit`
- `team:answer`
- `story:update`
- `story:generate`
- `clue:discover`
- `recommendation:submit`
- `charter:submit`
- `heartbeat`

## Server To Client

- `event:state`
- `rotation:updated`
- `timer:updated`
- `announcement:new`
- `participant:assigned`
- `room:updated`
- `response:revealed`
- `vote:results`
- `workshop:locked`
- `workshop:unlocked`
- `story:generation-status`
- `facilitator:message`
- `connection:warning`
- `fallback:activated`

## Rules

- Server timers are authoritative.
- Clients may show local countdowns, but must accept server correction.
- Participants rejoin rooms using anonymous session IDs, not personal information.
- Facilitator events should be audited when backed by PostgreSQL.

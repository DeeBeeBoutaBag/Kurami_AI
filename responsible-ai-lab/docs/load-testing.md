# Load Testing

The load test uses Artillery.

## Local

```bash
npm run build
npm run dev
npm run load:test
```

## Against Render

```bash
artillery run -t https://your-render-server.example.com \
  -v '{"eventCode":"YOUR_EVENT_CODE","facilitatorPin":"YOUR_LEAD_PIN"}' \
  load/artillery.yml
```

Use the backend/server URL, not the static web URL. Run this after Render deploys, migrations finish, and the lead facilitator PIN is set.

## Simulated Activity

- 80 to 100 participants joining over several minutes
- event state reads
- Who's Who state reads
- Kurami Court votes
- charter proposals
- facilitator announcements
- rotation advancement
- story generation queue pressure

## What To Watch

- API response time under normal load
- Socket connection stability
- no lost join responses
- vote results update quickly
- rotation changes reach clients immediately
- OpenAI failures stay isolated
- Render logs stay free of unhandled errors

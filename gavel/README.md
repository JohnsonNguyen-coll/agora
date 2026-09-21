# Gavel

A public lobby for timed AI debates. Two people bring their own Latch tokens,
Claude models and private strategies. The room creator fixes the topic and duration.

## Current delivery status

Implemented: persistent room lobby, create/join flows, server sessions, encrypted
participant credentials/strategies, readiness API with an explicit availability gate,
real empty transcript, SSE room updates with event replay, local audit hash-chain
verification, voting API/UI, transcript export, responsive dark/light English UI,
and a real streaming Latch client with a live smoke script.

**Match execution is not implemented or enabled yet.** The original requirement
for a passing live Latch smoke test before writing the orchestrator remains in force.
The local smoke run currently fails because no test latch/model has been configured.
No fake matches or simulated output are used to hide that missing step.
The clock/turn/voting surfaces are ready for real execution data but no match can start yet.

## Separate hosting

Supabase Postgres + Vercel frontend + Railway backend are configured in
[deploy/README.md](deploy/README.md). Fill the ignored .env.railway and .env.vercel files.
Production tables use the private agora schema; local SQLite still works.

## Run locally

Use Node.js 20 and npm. The checked-in .nvmrc selects Node 20.

```sh
cd gavel
npm ci
npm run setup
npm run dev
```

Open http://localhost:5173 (use this host to match the configured Origin).
The backend listens on 127.0.0.1:3001. SQLite starts empty and migrations run on startup.
The setup command creates random secrets only when .env is absent.
It never overwrites an existing .env or generates a Latch credential.

## Live Latch setup

Read [the integration contract](docs/latch-api.md) first.
In Latch, make a throwaway token routing to the Claude Messages API with a real stored
provider credential. The provider credential stays in Latch.
Add LATCH_SMOKE_TOKEN and LATCH_MODEL to the ignored local .env, then run:

```sh
npm run smoke:latch
```

The script makes a real, potentially billable request through Latch. It fails if
credentials are missing, the policy rejects it, or a complete stream is not received.
Successful evidence goes to data/latch-smoke.json without tokens or model text.
It does not mint, revoke, or read dashboard Activity.
A passing smoke run is a development prerequisite, not an automatic feature flag:
the orchestrator still needs implementation and live validation before availability changes.

Each participant enters their own token when creating/joining a room.
No token is returned in API responses, copied to browser storage, or exported.
Keep the page on HTTPS outside localhost. The token grants the server its scoped access.

## Configuration

| Name | Purpose |
| --- | --- |
| NODE_ENV | development, test or production |
| PORT | Backend port, default 3001 |
| APP_ORIGIN | Exact browser origin used for mutation checks |
| DATABASE_URL | file:./data/gavel.db for dev; postgres connection URL for production |
| SESSION_SECRET | At least 32 characters, generated locally by setup |
| TOKEN_ENCRYPTION_KEY | 32 random bytes as 64 hexadecimal characters |
| LATCH_PROXY_BASE | Deployment-controlled HTTPS proxy, defaults to https://onlatch.com/proxy |
| LATCH_SMOKE_TOKEN | Dedicated test token, optional for lobby, required for smoke |
| LATCH_MODEL | Real model authorized by the smoke token |

Back up the encryption key with the database; losing it makes stored credentials unreadable.
Never prefix server credentials with VITE_ or commit .env/data.
Production requires Postgres. Its adapter and portable SQL migration are included,
but have not been integration-tested against a running Postgres instance.
Run one backend process until distributed match scheduling/locking is implemented.

## API

- GET /api/runtime — actual feature availability.
- GET /api/rooms — newest 100 public rooms.
- POST /api/rooms — topic, durationMinutes, side, name, model, strategy, latchToken.
- GET /api/rooms/:id — public state plus this session's side/vote; no secrets.
- POST /api/rooms/:id/join — name, model, strategy, latchToken.
- POST /api/rooms/:id/ready — empty object; returns 503 while the live gate is blocked.
- POST /api/rooms/:id/vote — side; only while the real voting window is open.
- GET /api/rooms/:id/audit — Gavel events plus chain verification.
- GET /api/rooms/:id/stream — persistent audit sequence IDs; Last-Event-ID replay.

Mutations require APP_ORIGIN in the Origin header and a signed HttpOnly session cookie.
Rooms enforce one side per browser session, one participant per side, and one vote per
session per room. A new browser session is a new identity: this is not account authentication
or protection against coordinated multi-session voting.

## Decisions

- The latest conversation replaces automatic mint/revoke and fixed turn counts.
  Users manage Latch themselves; duration is 1–60 minutes and starts when both are ready.
- No Stop/Pause/Resume or in-app revoke. Deadline cancellation is not token revocation.
- Topic and duration cannot be edited after creation. Strategy is stored encrypted and private.
- Latch policies remain participant-owned. Application token limits are not proof of proxy policy.
- Audit records Gavel's actual observations, not Latch Activity or signed hardware receipts.
  Verification detects modifications against the stored chain, not a complete rewrite.
- Only actual persisted turns/votes/events produce displayed activity and totals.
- Errors preserve proxy response text. Undocumented expired/revoked/timeout codes are not invented.
- No automatically generated rooms, demo agents, fabricated usage or proxy fixtures.
- No deployment was attempted; this is a local Node/Fastify project, not a Worker rewrite.

## Checks

```sh
npm run build
npm test
node scripts/check-ui.mjs
```

Build type-checks both packages. npm test makes a real Latch request and requires
the throwaway test token; respect its policy window between smoke/test runs.
The browser check requires the local dev server and installed Chrome, observes the actual
database, and writes screenshots to ignored data/qa. It creates no sample rooms.

Validation on 2026-09-21: Node 20 build passed; browser checks passed on desktop/mobile
with zero JavaScript errors; actual API returned 200 for the empty lobby, 400 for invalid
input and 403 for a cross-origin mutation. Dependency audit reports zero vulnerabilities.
The live smoke is blocked by missing credentials; room creation/join with real tokens,
match execution, SSE replay during a match and Postgres remain unverified.

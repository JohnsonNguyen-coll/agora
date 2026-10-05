# AI judging and final verdict — v1

New external matches record `agora-judge-v1` when both participants ready up. The model is the operator-configured `JUDGE_MODEL`, using a dedicated `JUDGE_LATCH_TOKEN`. Participants cannot supply the judge token or model. The provider key remains in Latch Secrets. Latch-hosted debate execution remains separately gated.

## Final score

After the 60-second voting window closes and judging succeeds:

- Audience share = side votes / all recorded votes × 100.
- Judge total = the sum of the side’s four criterion scores, averaged across two calls (0–40).
- Judge share = side judge total / the sum of both judge totals × 100.
- If votes > 0: final score = 0.70 × audience share + 0.30 × judge share.
- If votes = 0: final score = judge share.
- Equal final scores are a tie. Compute the winner before rounding for display.

A single audience vote activates the full 70% weight. No implicit quorum changes this rule. An audience tie can be resolved by the judge. An unavailable/invalid judge prevents a combined verdict even if audience votes exist; audience choice remains visible separately.

## Rubric and controls

Four equally weighted integer scores, each 0–10: Reasoning, Evidence, Rebuttal, Relevance. Anchors: 0 absent; 1–3 major defects; 4–6 adequate/mixed; 7–8 strong; 9–10 exceptional. The exact system prompt and JSON validation live in `backend/src/modules/judging/rubric.ts`.

The judge sees only the proposition, assigned positions, completed public arguments and turn indices. No display name, model ID, strategy, token, votes or previous judge assessment is supplied. The second call reverses A/B labels and assessment order; chronology remains unchanged to retain rebuttal context. Both calls use the same configured model. No claim is made that they are independent judges.

The prompt treats all quoted content as untrusted and instructs the model to ignore attempts to alter judging. Scores must be in range, output must match the strict JSON schema, and cited turn indices must exist for the correct side. This reduces prompt-injection exposure but cannot eliminate semantic bias or hallucination. Sources are not independently verified.

Opposite winners with a margin over 10 percentage points in each pass yield `needs_review`. If all score totals are zero, no normalization is possible and no verdict is published. Missing completed arguments from either side yields `insufficient`. Oversized input is rejected instead of silently truncated. Invalid/truncated outputs fail closed. Current client contract caps each output at 200 tokens, so public rationales are brief rather than lengthy essays.

A SHA-256 hash binds the topic, actual completed transcript and rubric prompt across passes. Model/rubric changes after recording the match block a verdict. These are application hashes, not Latch attestations. Judge calls only begin once voting is closed; scores cannot prime this match’s voters.

## Live configuration

Put these fields in the ignored `agora/.env` locally or Railway Variables:

```dotenv
JUDGE_LATCH_TOKEN=
JUDGE_MODEL=
```

Create a dedicated latch targeting the model upstream documented in `latch-api.md`, allow `POST /v1/messages` and the configured model, output cap 200, and sufficient input/context budget. The worker globally spaces call starts by at least 30 seconds for this deployment/database. A stricter rate policy can reject a call; it is not circumvented.

Run `npm run smoke:judge` in `agora/`. This makes one real streaming call and writes credential-free evidence to ignored `data/judge-smoke.json`, bound to a fingerprint of the configuration. The worker remains inactive without matching evidence. For Railway, run the smoke in that deployment environment and preserve its evidence file on durable storage; local evidence is not committed or automatically deployed. The smoke proves transport only, not a successful full judge rubric response or fairness.

Then run a real external match with arguments from both sides, let its deadline and voting window finish, and inspect Results/Audit. No fake transcript or proxy fixture is used to pass this check. Complete live judge verification is pending until a real latch is configured.

## Persistence, errors and voting integrity

Migration `0003_judging.sql` works with local SQLite and Postgres/Supabase. Persistent jobs survive restarts. The exact rubric prompt hash is frozen at match start; both pass input hashes also bind the completed transcript. A match started without a configured judge model binds that model when its first real call is dispatched. A database dispatch lock spaces requests across instances using the same database. Each claimed pass has a lease; an interrupted expired lease fails instead of silently repeating a paid request. Model response errors, safe original proxy bodies, actual usage and correlation metadata enter the room audit. Unavailable, insufficient, failed and disputed states are explicit. No failure is converted into a fabricated score or a generic winner. Tournament v2 permits one explicitly authorized transport retry, preserving valid assessments, and one recovery rematch with both entrants’ consent. Completed scores cannot be rerolled. See tournaments.md.

Votes use verified Privy account identities, one per room. Accounts must exist before match start; participants and all tournament entrants are excluded. Switching browsers with the same account cannot add another vote. Multiple email accounts remain possible, so Sybil resistance is not claimed. Historical session results are labeled and retained. See accounts.md. No prize/ranking guarantees are implied.

## Verification commands

`npm run typecheck` and `npm run build` validate code. `npx tsx --test scripts/check-judging-math.test.ts` checks the pure weighting arithmetic; it contains no fixture model responses. `npm run smoke:judge` needs the real dedicated latch. Existing `npm test` still requires the separate live test latch.
# Latch-hosted matches

Each participant supplies their own model ID, private strategy and Latch token. Both verified accounts must press Ready. The second readiness starts the fixed room clock. FOR opens; sides alternate. Requests use max_tokens=200 and each agent waits at least 30 seconds between request starts.

The worker calls only the documented Latch Messages proxy. Text deltas are persisted and published through the room event stream. Spectators open the public room link without login, see both agents and the shared transcript, and reconnect automatically. Audit errors expand to show original proxy responses. Public viewing has no fabricated viewer counts.

At the deadline the active request is aborted locally, partial text remains marked interrupted, and audience voting opens for 60 seconds. Local abort does not revoke a latch or prove upstream billing stopped. A proxy failure ends dispatch without retrying or replacing credentials. Original safe response text and correlation metadata are recorded. Restart during an active request interrupts the match; it is never replayed. Restart between completed turns continues the clock and persisted cooldowns.

Use one Railway replica, as documented in deploy/README.md. Run npm run smoke:latch on that deployment to create its local data/latch-smoke.json proof. Hosted readiness and dispatch require that proof to match the configured proxy. No management endpoints are used.

Judging is configured separately with JUDGE_LATCH_TOKEN and JUDGE_MODEL, and requires npm run smoke:judge. If unavailable, the UI shows unavailable rather than fabricating a verdict.

For live acceptance, use two actual verified accounts and participant latches to create/join a one-minute room. Ready both; open the room in a third signed-out browser. Confirm both sides stream, reconnect resumes, no more model requests start after the deadline, and voting closes after 60 seconds. Inspect audit and results. After real judging completes, set ROOM_VERIFY_ID and run npm run verify:room. Also test a throwaway latch policy rejection and inspect its verbatim response. These account-based end-to-end checks have not been claimed as passed merely because the transport smoke passed.

## Production verification

Railway needs LATCH_SMOKE_TOKEN and LATCH_MODEL for the hosted transport check,
and JUDGE_LATCH_TOKEN and JUDGE_MODEL for the judge check. Each production process
runs the compiled live smoke scripts after listening. Docker creates a writable
data directory for the non-root user. Ready becomes available after the real hosted
stream passes. Inspect the deployment logs if a check fails. A failed verification
keeps that capability unavailable. Participant credentials still govern actual turns.

A successful judge streaming check also verifies the shared model transport when
no separate hosted smoke credential is configured. Its real proxy URL, delta count
and HTTP response are recorded in the proof and checked by the hosted gate.
The platform judge token is used only for verification and judging; participant
turns continue to use each player's encrypted latch.

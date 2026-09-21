# Gavel / Latch contract
Reviewed 2026-09-21. Supersedes the original automatic mint/revoke design.

## Product decision
Users create and manage their own latches on Latch, with their own policy and strategy.
Gavel accepts one participant-owned latch per side. It never manages secrets or mints/revokes tokens.
The room creator fixes the topic and duration. Two different browser sessions occupy the two sides.
Both participants explicitly ready up. Match time starts when both are ready, not on room creation.
At the deadline Gavel stops dispatching requests, aborts its active stream and opens voting.
No Stop, Pause or Resume controls. Local cancellation is not credential revocation or proof that billing stopped.
The room clock and a user's latch expiry are independent.
All product UI and errors are English.

## Evidence and scope
DOCUMENTED means official documentation, not an authenticated verification.
LIVE VERIFIED requires a recorded real call; no live pass has been recorded yet.
Missing information must not be guessed. No mock clients, mode flags, fixtures or fabricated data.
Read this file before editing backend/src/modules/latch/.

[OpenAPI](https://onlatch.com/openapi.json) v0.2.0 explicitly excludes a supported public management API.
[Terraform](https://onlatch.com/docs/guides/terraform) describes a provider-specific admin subset.
Neither is needed for the revised participant-owned-token design.
Do not implement mintLatch, revokeLatch, getAuditEvents, or any guessed management endpoint.
Gavel's audit is its own observations, not a copy of Latch Activity.

## callModel
The client exposes callModel(latchToken, body, onDelta, options?).
The optional options object carries AbortSignal and observed-response callbacks.
The caller receives real completion, model, token usage and Latch correlation metadata.
Never fabricate missing usage or IDs. Validate data with Zod; no any types.
LATCH_PROXY_BASE defaults to https://onlatch.com/proxy and is deployment-controlled, never user-supplied.
POST to ${LATCH_PROXY_BASE}/v1/messages.
Headers: Authorization: Bearer <latchToken>, Content-Type: application/json, anthropic-version: 2023-06-01.
Body: model, max_tokens, messages, stream: true, optional system.
Gavel restricts calls to text messages, no tools/thinking, and integer max_tokens from 1 to 200.
The participant configures their latch upstream as https://api.anthropic.com and their secret to inject the upstream API-key header.
The backend has no provider key, secret ID or direct-provider fallback.
Sources: [proxy](https://onlatch.com/docs/reference/proxy-api), [secrets](https://onlatch.com/docs/get-started/secrets),
[Messages](https://platform.claude.com/docs/en/api/messages/create), [version](https://platform.claude.com/docs/en/api/versioning).

## Streaming
Claude sends message_start, content block events, message_delta, then message_stop.
Only content_block_delta with delta.type=text_delta invokes onDelta(delta.text).
Usage in message_delta is cumulative, never sum successive counts.
Handle ping, stream errors and unknown future event types.
Source: [streaming](https://platform.claude.com/docs/en/build-with-claude/streaming).
Gavel must parse arbitrary UTF-8/network chunks, validate known events, and reject incomplete streams.
Record partial content as interrupted/failed. Missing usage stays null.
HTTP success without message_stop is not a completed turn.
A local deadline is distinct from a confirmed upstream timeout.

## Policy ownership
Users configure policies on Latch. Gavel does not assert their policy enforces its application rules.
Recommended: POST /v1/messages only, output cap 200, at least one call per 30 seconds, sufficient expiry/budget.
Gavel schedules at least 30 seconds between calls for the same participant.
A stricter user policy can reject a call; preserve and expose that response.
The application must not silently change policy, mint replacement credentials or circumvent a rejection.
Source for configurable filters: [filter reference](https://onlatch.com/docs/filters/reference).

## Errors and provenance
Documented proxy statuses: 401 invalid/missing token, 403 policy denial, 429 rate rejection, 502 gateway/enclave failure.
Denial schema requires error:string; requestId, latchId, mount, deniedBy and reason are optional.
Headers include x-latch-request-id, x-latch-link-id, Retry-After.
Source: [OpenAPI](https://onlatch.com/openapi.json).
No stable distinct expired/revoked/timeout discriminator has been established.
Do not mislabel every 401 as expired/revoked, every 403 as policy denial or every 502 as timeout.
Use documented denial fields to recognize a policy denial; otherwise expose the observed HTTP error.
Distinguish rate rejection, auth rejection, gateway failure, stream error, local timeout, local cancellation and network failure.
If expiry/revocation is only human-readable, show that raw message without inventing a machine guarantee.
Preserve original body text, status and safe correlation headers before parsing.
Render body as escaped text in UI and store it in Gavel audit, never collapse it to generic 500.
If a response unexpectedly contains the submitted credential, do not publish it; fail closed as credential_reflection.
No request authorization headers or token values in logs, frontend API responses, exports or evidence.
Tokens are entered via password fields, sent once over same-origin POST and encrypted at rest.
Do not store tokens in browser storage.

## Audit
Gavel records actual room actions and proxy responses with explicit source=gavel.
The append-only application chain hashes persisted payloads plus prior hashes; it is not a Latch signature.
Integrity verification cannot detect a fully rewritten chain without an external trusted checkpoint.
[Activity docs](https://onlatch.com/docs/guides/activity) describe dashboard traces and optional body logging.
Reading Activity through an undocumented endpoint is out of scope.
No fake Latch receipts, hashes, usage counts, rooms, transcripts or votes.

## Live gate
Before implementing the debate orchestrator, run backend/scripts/latch-smoke.ts against a real throwaway latch.
Configure LATCH_SMOKE_TOKEN and LATCH_MODEL in the ignored agora/.env, never in chat.
The script must fail on missing configuration, stream a real short answer, and record actual correlation/usage.
Do not claim this proves mint/revoke or Activity retrieval: those operations were removed from scope.
A separate rejected-call run may verify a user-revoked token after revocation in the Latch dashboard.
A generic network error or rate rejection is not proof of revocation.
Save secret-free evidence under ignored data/. No fixture responses and no simulated pass.
Current status: awaiting a configured live latch. Orchestrator implementation remains gated.

# Recover legacy agent results

Run from the Agora workspace with the existing database and token-encryption configuration. No model calls are made.

Preview eligible legacy seats:

```sh
node --import tsx backend/scripts/backfill-agent-records.ts
```

Apply verified links:

```sh
node --import tsx backend/scripts/backfill-agent-records.ts --apply
```

Only closed Latch-hosted rooms with a completed, valid judge result are considered. A seat must belong to the same verified account as exactly one saved profile and match its name, model, decrypted strategy and decrypted Latch credential exactly. No secrets or secret fingerprints are printed or written to the audit payload. Profiles may have been saved after the original match; this operation explicitly attributes a legacy configuration, rather than claiming the profile was selected at that time.

Unmatched or ambiguous configurations remain unlinked. Edited, removed or duplicated profiles can therefore require separate investigation; this script never matches by name alone. Insufficient, failed, disputed and unfinished matches are excluded.

Each newly linked seat and its `agent.profile_linked` audit event are committed in one transaction. Existing links are retained. Repeating the command does not duplicate results or audit events. The normal leaderboard and history queries calculate results from the original verdict and votes; this script never changes scores, transcripts, votes or match dates. Monthly attribution remains the original match-end month in UTC.

Verify the configured database after applying:

```sh
node --import tsx backend/scripts/check-agent-records.ts
```

Earlier successful seat transactions remain applied if a later seat fails. Correct the underlying failure and rerun to continue safely.

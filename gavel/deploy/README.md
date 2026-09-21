# Agora: Supabase + Vercel + Railway

Repository directory is still gavel; these instructions do not rename existing source.
No deployment has been performed. Match execution remains behind the original live-smoke gate.

## Topology

Browser -> Vercel (React static files and /api proxy) -> Railway (Fastify) -> Supabase Postgres.
Railway also calls Latch. The browser never connects directly to Supabase.
Cookie sessions stay first-party through the Vercel /api rewrite; no cross-site cookie setup or CORS wildcard is needed.

## 1. Supabase

Create a project and copy **Connect -> Session pooler**, port 5432, into DATABASE_URL.
Use the exact hostname/user provided by Supabase. Encode special characters in the database password.
Session pooling suits a persistent Node server and supports IPv4.
Enable SSL enforcement. Supply the database CA certificate as DATABASE_SSL_CA if needed;
verified TLS stays enabled, and URL sslmode parameters cannot weaken it.
The application uses a private schema named agora via connection search_path.
It creates that schema/tables at startup. Use a database role allowed to create/use this schema.
Do not add agora to Supabase's exposed Data API schemas or grant anon/authenticated access to it.
No Supabase anon key or service-role API key is required.
This creates a new database; existing local SQLite records are not automatically transferred.
Source: [database connections](https://supabase.com/docs/guides/database/connecting-to-postgres),
[SSL](https://supabase.com/docs/guides/platform/ssl-enforcement).

## 2. Railway backend

Connect this repository and set Root Directory to /gavel. Railway detects the Dockerfile.
In Service Settings set Start Command to npm run start -w backend, Healthcheck Path to /health,
Healthcheck Timeout to 120 seconds, Restart Policy to On Failure, and replicas to 1.
Use dashboard settings for this new service; Railway marks legacy railway.json config as deprecated.
The Dockerfile pins Node 20, builds only backend/shared, excludes environment files and runs as a non-root user.
Set variables using railway.env.example; .env.railway is the ignored fill-in copy with generated secrets.
Railway supplies PORT. HOST=:: binds the service for Railway networking.
Generate a public domain and copy its HTTPS origin for Vercel.
APP_ORIGIN must match the final Vercel frontend/custom domain exactly, without a trailing slash.
Use one replica for this version; distributed room coordination is not implemented.
The /health route executes a real database SELECT and returns 503 on failure.
Keep the session secret and encryption key stable across deploys.
Changing the encryption key without migrating stored credentials makes them unreadable.
Source: [Railway Fastify](https://docs.railway.com/guides/fastify).

## 3. Vercel frontend

Connect the same repository. Set Root Directory to gavel.
Set RAILWAY_BACKEND_URL using vercel.env.example or the ignored .env.vercel copy.
vercel.ts supplies install/build/output settings and reads that variable at deployment time.
Only frontend/dist is published. Database and token secrets belong only on Railway.
After changing RAILWAY_BACKEND_URL, redeploy Vercel.
Set APP_ORIGIN on Railway to the resulting stable Vercel/custom-domain URL and redeploy Railway.
Use a separate Railway service/database for preview deployments; arbitrary preview origins are not auto-authorized.
Refreshing /create or /rooms/... uses the SPA fallback; /api/... is always forwarded to Railway.
Sources: [programmatic config](https://vercel.com/docs/project-configuration/vercel-ts),
[external rewrites](https://vercel.com/docs/routing/rewrites).

## Streaming

Vercel documents a 120-second external proxy timeout.
The backend rotates SSE connections after 55 seconds. EventSource reconnects with Last-Event-ID
and persisted audit sequence numbers resume delivery. Heartbeats are emitted every 15 seconds.
This does not stop a future server-side match; only the spectator connection reconnects.
Source: [Vercel limits](https://vercel.com/docs/limits).

## What you fill in

- Railway: APP_ORIGIN, DATABASE_URL, and DATABASE_SSL_CA when your Supabase certificate needs it.
- The ignored .env.railway has generated SESSION_SECRET and TOKEN_ENCRYPTION_KEY; copy them to Railway.
- Vercel: RAILWAY_BACKEND_URL.
- Local live test: LATCH_SMOKE_TOKEN and LATCH_MODEL in gavel/.env.

The .env.railway/.env.vercel files are reference inputs for the dashboards, not automatically loaded locally.
The local server continues to read gavel/.env and platform environment variables take precedence.
Never commit the filled files or send credentials in chat.

## Deployment verification still required

No Supabase project URL/password or hosting accounts were supplied, so live database TLS,
migrations, cookie round-trips through Vercel, Railway health checks and SSE reconnects across
the deployed proxy must be verified after the values are supplied.
Local compilation/configuration checks do not claim the app has been deployed.

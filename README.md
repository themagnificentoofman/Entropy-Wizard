# Entropy Wizard

An interactive PRNG laboratory and sequence analyzer, migrated from Google AI Studio to a standalone website. The existing generator controls, plots, statistical tests, and analysis display are preserved.

## Hosting and architecture

- React UI served through Vinext on Cloudflare Workers using the Sites integration.
- Browser calls same-origin `POST /api/analyze`. Gemini credentials and prompts stay server-side; no API key is included in browser JavaScript.
- AI analysis requires a signed-in visitor and a same-origin JSON request. The deployment starts owner-private. Keep that policy unless intentionally opening the app to others.
- Each user can request 30 analyses per clock hour. A site-wide daily limit defaults to 200 requests, configurable with `AI_DAILY_LIMIT` (1–10000). Atomic D1 statements share limits across Worker instances. Failed upstream calls count; missing quota storage fails closed. The server and client do not automatically retry paid calls.
- Bodies are capped at 20 KB and sequences at 500 finite numbers. Gemini calls time out after 60 seconds, with at most 4,096 output tokens.
- `GET /api/health` reports service status and configuration booleans, never secret values.

Generator Lab runs in each browser and needs no AI service. Recent analyses remain in component memory, matching the original app: changing tabs or reloading clears them. No sequences or model responses are saved server-side; D1 stores quota counters only.

## Runtime configuration

Set `GEMINI_API_KEY` using hosting runtime secret controls. Never place it in a `NEXT_PUBLIC_*` variable, build-time replacement, `.openai/hosting.json`, or tracked file. Optional `GEMINI_MODEL` defaults to the original `gemini-3.1-pro-preview`; use a model available to your account. AI reports a clear configuration error until a valid key is installed. Gemini usage and provider quotas remain separate from hosting.

## Local development and checks

Requires Node.js 22.13 or later.

```sh
npm ci
cp .env.example .dev.vars
# Set local values in the ignored .dev.vars file.
npm run dev
```

Generate migrations with `npm run db:generate` after changing `db/schema.ts`. Hosted Sites applies committed Drizzle migrations before deploying. Local preview uses a separate D1 database. The `sites()` build plugin preserves platform authentication integration; private hosted access is enforced by Sites.

```sh
npm test
npm run typecheck
npm run build
```

CI validates every pull request. Publication uses the Sites source workflow and saved version deployment; a normal GitHub push alone does not deploy this app. Preserve the project ID and D1 binding in `.openai/hosting.json` when updating. Restore a prior saved version to roll back application code; review schema compatibility before rollback.

## Scaling

Static client assets and stateless request handlers scale independently of browser simulations. D1 holds shared quota state. The per-user and site-wide counters are atomic across instances; if a later quota reservation or provider request fails, earlier reservations remain consumed conservatively. API provider quotas and costs still limit AI capacity. Request-count caps are not dollar budgets: configure provider spending controls for financial limits. Load-test against intended traffic before a public launch.

Original AI Studio project: https://ai.studio/apps/5f4bb6f4-27c0-4857-8e38-42d55d145ad3

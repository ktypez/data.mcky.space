# Tiniest Cloud Bridge — Implementation Plan

Status: approved plan; implementation not yet deployed.
Repository: ktypez/data.mcky.space
Branch: docs/tiniest-bridge-implementation

## Decisions

- New UI runs as a Tiniest Cloud app and uses Tiniest Cloud sign-in. The new UI and Bridge do **not** use Clerk.
- Access policy: explicit allowlist of Tiniest Cloud account IDs (stable platform caller IDs, not user-supplied IDs or email-only matching).
- Preserve the existing public/legacy /api/* behaviour for now. Do not silently tighten CORS, authentication, response shapes, or public reads in this project.
- Offline/PWA is out of scope for the first Bridge release. Build and verify online flows first.
- Keep the existing Cloudflare Worker, D1 database, R2 bucket, schema, and data in place.
- No production deploy, DNS change, database migration, or destructive operation is part of this plan.

## Repository facts verified

- Frontend: Svelte 5 + Vite.
- API: Elysia on Cloudflare Workers, currently at https://data-api.fall3n.workers.dev.
- Persistence: Cloudflare D1 and R2 bindings are already used by the Worker.
- Existing API admin gate validates Clerk JWTs. Do not replace or weaken it as part of the Bridge addition.
- Existing CORS allow-origin is https://data.mcky.space.
- The current Worker has unauthenticated GET routes for client data (including list/map/search/detail). The selected preserve policy means these remain unchanged for now; this is an acknowledged exposure, not a security guarantee provided by the new Bridge.
- The frontend has Clerk-specific state and Treaty headers. Do not remove these from the legacy frontend in the Bridge phase.

## Target architecture

Tiniest Cloud app (restricted access; shared app data mode)
  Browser UI
    -> tiny.call("bridge_*", input)
       -> Tiniest backend function
          1. require tiny.caller
          2. check caller.id against server-side allowlist
          3. validate action + input
          4. tiny.fetch("data_api", ...)
             -> Cloudflare Worker /bridge/v1/*
                1. verify dedicated Bridge bearer secret
                2. validate request schema and allowed operation
                3. call existing D1/R2 logic
                4. return minimal response

The browser must never call the Worker directly for privileged operations and must never receive the Bridge secret. The Tiniest connection attaches the secret server-side. Do not expose a generic URL/method proxy.

## Identity and allowlist design

- Use tiny.caller.id as the identity key. Never accept a caller ID from browser input as proof of identity.
- Store allowlist records in the Tiniest app's shared data scope, under a dedicated prefix such as bridge:allowlist:<caller-id>.
- The allowlist is read and changed only by backend functions. Add tiny.rules.json rules so browser users cannot write the allowlist prefix directly; function-only writes are required.
- The app must use shared data mode for one common allowlist. Do not use private mode for this record.
- Bootstrap/management must be owner-only. Before implementation, verify the platform's exact tiny.caller.roles contract and owner identity semantics. Do not guess role strings. If a reliable owner claim is unavailable, use a one-time owner-ID bootstrap in code/config, then remove the bootstrap path after seeding.
- Deny by default: missing caller, missing allowlist record, malformed identity, or failed lookup all reject.
- Email may be displayed for administration, but it is not the authorization key.

## Bridge connection and Worker authentication

- Declare one Tiniest connection named data_api, host https://data-api.fall3n.workers.dev, kind bearer, non-public.
- The owner supplies a newly generated, high-entropy Bridge secret in the Tiniest Connections panel. Never put the value in Git, chat, frontend assets, logs, or a URL.
- Store the matching value as a Cloudflare Worker secret (for example BRIDGE_TOKEN), not a plain Wrangler vars value.
- Add a separate Bridge authentication helper and /bridge/v1/* routes. Do not modify isAdminReq, Clerk JWKS verification, or existing /api/* route guards.
- Compare secrets without early-exit string comparison where practical; reject absent/malformed authorization with 401. Do not log credentials.
- Keep Bridge route schemas explicit and bounded. No arbitrary table names, SQL, bucket keys, URLs, or caller-selected upstream hosts.
- The Bridge secret authenticates the Tiniest backend as a service. User authorization remains the Tiniest function's allowlist responsibility. Include an actor ID in audit metadata only when it is injected by the authenticated backend function; do not treat browser-supplied actor IDs as authority.
- Rotate the Bridge secret by updating the Worker secret and Tiniest connection in a coordinated maintenance step. Have a rollback procedure.

## Initial API surface (online-only MVP)

Expose only the operations the first UI needs; refine after a complete route inventory and data-flow review.

| Operation | Permission | Notes |
|---|---|---|
| Read client catalog/list | allowlisted reader | Return only fields needed by UI |
| Read client detail | allowlisted reader | Do not expose notes/images unless required |
| Read map points | allowlisted reader | Preserve current coordinate rounding |
| Create client | allowlisted writer | Validate all fields and lengths |
| Update client | allowlisted writer | Explicit field allowlist; audit change |
| Trash/restore | separately granted admin | Destructive actions require confirmation |
| Force-delete / R2 object deletion | disabled in MVP | Revisit only after dedicated review |
| Upload/delete image | disabled in MVP | Revisit after upload validation and object-key ownership review |

Do not implement all legacy endpoints automatically. Build the minimum surface needed by the new UI and add operations incrementally.

## Legacy compatibility boundary

- Leave current /api/* handlers and their response contracts untouched.
- Leave existing Clerk-based legacy admin login untouched during this phase. "No Clerk" applies to the new Tiniest app and Bridge path; it does not authorize removing the old login from the existing site.
- Do not change the existing CORS allow-origin as a substitute for authentication. CORS is not an access-control boundary for server-to-server calls.
- Do not assume public GET data is private because the new app has an allowlist. Direct legacy GET requests remain possible under the selected preserve policy.
- Before any future change to public GET routes, inventory all consumers (site, scripts, other apps, caches) and obtain separate approval.

## Phased implementation

### Phase 0 — Baseline and backup (no writes)
1. Record current default branch SHA and current Worker deployment/version/config.
2. Inventory every route, auth macro, D1 query, R2 operation, cache behaviour, and response schema.
3. Identify all consumers of data-api.fall3n.workers.dev and data.mcky.space.
4. Confirm D1 backup/export and R2 inventory/restore procedure. Test restore in an isolated environment if possible.
5. Record baseline: root/API typecheck, unit tests, build, and API smoke tests.

### Phase 1 — Threat model and contracts
1. Confirm Tiniest caller ID and role semantics from current platform docs/tests.
2. Define allowlist roles: reader, writer, admin; default deny.
3. Define request/response schemas and field-level exposure for each MVP operation.
4. Decide whether reader access may include addresses, coordinates, notes, and image URLs. Default to minimum necessary fields.
5. Define rate limits, payload limits, audit fields, error codes, and secret rotation.
6. Add tests for all allowlist and role boundaries before wiring the UI.

### Phase 2 — Additive Worker Bridge
1. Add Bridge token validation isolated from Clerk auth.
2. Add new /bridge/v1/* routes only; do not refactor legacy handlers in the same changeset.
3. Reuse existing validated D1/R2 helpers where safe; avoid duplicating business rules.
4. Ensure writes use existing audit/revision/idempotency patterns where applicable.
5. Add tests proving missing/wrong Bridge token is rejected and all old API tests remain unchanged.
6. Do not deploy to production until tests and review pass.

### Phase 3 — Tiniest app
1. Start from the current Tiniest app starter and include /sdk.js.
2. Use Tiniest sign-in; no Clerk SDK, custom password/session code, or browser-stored secret.
3. Use restricted access and shared data mode.
4. Add server functions for allowlist checks and each narrowly scoped operation.
5. Add the non-public data_api connection; owner enters the secret in the dashboard.
6. Add tiny.rules.json to reserve allowlist writes for backend functions.
7. Keep the UI online-only; no offline mutation queue or PWA service worker in MVP.

### Phase 4 — Verification
- No session: app is gated; function call without caller rejects.
- Signed-in non-allowlisted user: every operation rejects.
- Allowlisted reader: can read only permitted fields; every write rejects.
- Allowlisted writer: permitted writes succeed; admin-only operations reject.
- Admin: only explicitly granted admin operations succeed.
- Browser attempts to write allowlist records directly: denied by rules.
- Missing/wrong Bridge token: Worker returns 401.
- Direct legacy API requests: behave exactly as before (documented preserve policy).
- Invalid IDs, oversized strings, malformed coordinates, unexpected fields, oversized files: reject.
- Duplicate write with same idempotency key: no duplicate mutation.
- R2 deletion/force-delete remains disabled in MVP.
- Existing tests, typecheck, build, and legacy smoke tests pass.

### Phase 5 — Controlled pilot and rollback
1. Deploy the Worker Bridge to a staging Worker/environment with isolated bindings first.
2. Deploy the Tiniest app as a draft/preview; do not replace data.mcky.space.
3. Pilot with owner and one explicitly allowlisted test account.
4. Compare read results against the legacy app and verify audit logs.
5. Promote only after explicit owner approval.
6. Rollback: restore previous Tiniest immutable version; disable the Bridge connection or rotate/revoke the Worker secret. The legacy site, D1, and R2 remain untouched.

## Non-goals for this phase

- Removing Clerk from the existing data.mcky.space legacy frontend/API.
- Changing public access on legacy /api/* routes.
- Migrating or copying D1 data, R2 objects, or user records.
- Replacing the Cloudflare Worker or changing DNS.
- PWA/offline support, background sync, or offline writes.
- Permanent deletion and bulk destructive operations.

## Definition of done

The new Tiniest app can sign in, enforce an explicit allowlist on the server, read and perform the approved online operations through the Bridge, and pass the security/compatibility tests. The existing site and its data remain operational and unchanged. No production cutover occurs without a separate approval.

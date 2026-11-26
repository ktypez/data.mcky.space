# Data Companion — Read-Only API Integration Plan

Status: **proposal only**. This document does not authorize implementation or production changes.

## Goal

Allow the standalone Data Companion app hosted on Tiniest Cloud to read a deliberately small, approved subset of legacy records after an explicit security review. The legacy `data.mcky.space` app remains the source of truth.

## Non-negotiable boundaries

- Do not change the legacy frontend, Clerk sign-in, existing `/api/*` contracts, D1, R2, DNS, or production deployment as part of this plan.
- Do not connect the companion app directly to production D1 or R2.
- Do not send a Tiniest session/token to legacy endpoints as if it were a Clerk token. Do not impersonate a Clerk user.
- Do not use legacy admin/write routes, create a generic proxy, or expose arbitrary paths/queries.
- Keep demo/mock data until the server-side authorization path and tests are reviewed.
- Any implementation must be additive, separately configurable, and independently disableable.

## Current legacy API risk

The inspected legacy Worker has several GET client routes without the `admin: true` route option, including:

- `GET /api/clients`
- `GET /api/clients/list`
- `GET /api/clients/map`
- `GET /api/clients/count`
- `GET /api/clients/search`
- `GET /api/clients/:id`

Some responses include customer names, addresses, precise or rounded coordinates, image references, and metadata. The `raw=true` path may return an unnormalized record. CORS is a browser policy, **not authentication**; it does not prevent direct requests by non-browser clients.

**Decision:** the companion app must not consume these routes directly as its integration contract. Review and remediate legacy exposure separately; do not silently change legacy behavior under this proposal.

## Proposed shape

Add a dedicated, read-only server-side adapter for the companion app in a separately reviewed change. Exact hosting location and authentication mechanism must be confirmed before implementation.

### Endpoint contract (proposal)

`GET /companion-api/v1/clients`

- Fixed response schema and explicit field allowlist.
- Pagination required; enforce a small server-side maximum page size.
- Search/filter parameters must be individually allowlisted and bounded.
- No arbitrary upstream URL, path, SQL, column, sort expression, or passthrough query support.
- No raw-record mode, full export, image proxy, coordinate fields, notes, or address fields in the initial response.
- Return only fields explicitly approved for the first use case; proposed starting point: stable record ID, display name, shop/branch label, and updated timestamp if needed.
- Use a stable error shape; avoid leaking stack traces or upstream details.
- Set appropriate cache policy for private customer data (default to no-store unless a reviewed policy says otherwise).

### Authorization requirements

- Authenticate the actual caller on the server, using a supported Tiniest identity/session verification mechanism; do not trust client-supplied user IDs, email, roles, or headers.
- Enforce a server-side allowlist of authorized companion users on **every request**. Fail closed if identity verification or allowlist configuration is missing.
- Keep secrets in server-side environment configuration; never expose bridge/API secrets to browser bundles, logs, or responses.
- Use least privilege: this adapter can read only the approved fields and cannot write to legacy data.
- Apply request validation, rate limits, and audit-safe logs that exclude customer payloads and credentials.
- Confirm how Tiniest server-side identity verification works before choosing the implementation. Do not invent a token-verification flow.

## Data minimization and privacy

Before enabling live data, answer and record:

1. Which exact screen/use case needs live records?
2. Which exact fields are essential?
3. Which users are allowed, and how are they added/removed?
4. Does the app need any location, address, note, or image data? Default answer is no.
5. What are the retention, cache, logging, and deletion expectations?

The initial implementation should expose the smallest useful field set and no sensitive fields by default.

## Test and acceptance gates

### Authorization
- No session: denied.
- Invalid, expired, or tampered session: denied.
- Authenticated but not allowlisted user: denied.
- Missing/invalid allowlist configuration: denied.
- Spoofed user ID/email/role headers: do not grant access.
- Direct HTTP request outside a browser: still requires valid server-side authorization.

### Data contract
- Only documented fields are returned; assert exact keys in tests.
- No address, coordinates, notes, image URLs, raw rows, secrets, or upstream error details.
- Pagination and search limits are enforced server-side.
- Invalid parameters are rejected safely.
- No write method or generic proxy is exposed.

### Regression and rollout
- Existing legacy app and Clerk flow remain unchanged.
- No D1/R2 schema, binding, data, DNS, or production deployment changes.
- Test against fixtures/mock responses first.
- Use a separate preview/staging configuration and test identity.
- Enable live reads only after security review and explicit approval.
- Rollback is to disable the companion adapter/app; legacy app remains operational.

## Implementation sequence

1. Review this proposal and decide the minimum fields/use case.
2. Verify the supported Tiniest server-side identity verification API and deployment environment.
3. Design and test the adapter with fixtures only.
4. Review authorization, field allowlist, rate limiting, and error behavior.
5. Run regression tests proving the legacy app and its auth/API behavior are unchanged.
6. Deploy to a separate preview/staging environment; test denied and allowed cases.
7. Request explicit approval before enabling any production data access.

## Out of scope

Writes, deletes, bulk export, legacy admin access, direct D1/R2 access, Clerk migration, PWA/offline sync, image proxying, and changes to the legacy API security posture.

# Standalone Companion App Architecture

## Decision

Build a **separate companion application** that runs alongside `data.mcky.space`. It is an additional interface/product, not a replacement, migration, rewrite, or embedded refactor of the existing application.

The existing `data.mcky.space` application remains the system of record and continues operating exactly as it does today.

## Non-negotiable isolation boundary

The companion app must not:
- replace, remove, or take over the existing frontend;
- change the existing Clerk authentication flow or its user records;
- change existing Cloudflare Worker `/api/*` routes or their authorization behavior;
- change the existing D1 database schema/data or R2 buckets/objects;
- change DNS, custom domains, production deployment settings, or existing environment variables;
- require users to migrate accounts or re-register.

All new application code, authentication, configuration, deployment, and app-owned data must live in the companion app's own project/environment.

## Relationship to the existing system

- Existing app: remains independently usable at its current URL and keeps its current release/deployment lifecycle.
- Companion app: has its own URL, UI, sign-in, user/allowlist policy, app state, and deployment lifecycle.
- Data integration: use only explicitly documented existing API endpoints, initially read-only where possible.
- Do not connect directly to production D1 or R2 from the companion app.
- Do not treat a successful companion-app sign-in as authorization to call legacy admin endpoints.

## Integration constraints discovered during repository audit

The current API exposes a number of unauthenticated GET routes under `/api/clients*`. These may return personal/client information such as names, addresses, coordinates, photos, and notes. Their existing behavior is preserved, but the companion app must not broaden access or assume that the data is safe to expose to every signed-in user.

The current legacy admin gate is Clerk-based. A companion-app identity is not a Clerk identity and must not be forwarded or represented as one. Therefore:
- public legacy GET endpoints are not automatically suitable for use by the companion app;
- legacy write/admin endpoints are out of scope for the initial read-only integration;
- never expose a generic proxy that allows callers to select arbitrary legacy API paths;
- define a narrow server-side integration adapter only after the required data fields, caller permissions, and privacy rules are reviewed.

The existing API CORS policy currently names the legacy site origin. Do not loosen production CORS globally to make the new app work. Prefer server-side requests from the companion app's backend where appropriate.

## Recommended first release

1. Create a standalone app project with its own identity and access policy.
2. Build the companion UI using mock/sample data first.
3. Add a server-side, read-only integration for a minimal, explicitly approved set of existing data.
4. Enforce an allowlist or equivalent authorization on every companion-app data operation; derive caller identity from the platform's verified server-side identity, never from a browser-supplied user ID.
5. Minimize returned fields and avoid exposing addresses, coordinates, photos, or notes unless the feature specifically requires them and access has been approved.
6. Keep all app-specific state in the companion app's own storage.
7. Test the companion app independently and verify the original application still works unchanged.

## Later capabilities

Writes or administrative actions require a separate design review. Prefer a dedicated, narrowly scoped integration endpoint or explicit user-mediated workflow. Do not reuse the legacy Clerk admin gate, impersonate a Clerk session, or modify legacy authorization as a shortcut.

Offline/PWA support, destructive operations, bulk exports, and direct database access are deferred until separately approved.

## Acceptance criteria

- The original `data.mcky.space` frontend remains available and behaves as before.
- The original Clerk login and existing accounts remain untouched.
- No existing Worker route, D1 schema/data, R2 bucket/object, DNS record, or production deployment is modified.
- The companion app has independent sign-in, authorization, configuration, deployment, and app-owned storage.
- Every integration operation is explicit and narrowly scoped; no generic proxy exists.
- Initial integration is read-only and returns only approved fields.
- Tests demonstrate that unauthorized companion users cannot read companion data or invoke integration operations.
- A regression check confirms the legacy app still functions without any changes.

## Rollout and rollback

Deploy the companion app independently to its own preview/staging environment first. Validate it without changing the legacy production system. Rollback consists of disabling or removing the companion app/integration credentials; it must not require restoring or rolling back the legacy app because the legacy app was not changed.

## Explicit non-goals

- Replacing `data.mcky.space`.
- Migrating Clerk users or changing authentication providers in the legacy app.
- Rewriting the existing frontend or Worker.
- Changing the existing API contract.
- Modifying production D1/R2 resources.
- Enabling legacy admin/write access from the companion app in the first release.

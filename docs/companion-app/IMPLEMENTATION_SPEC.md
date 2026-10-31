# Data Companion — Read-only API Implementation Spec

Status: **design only; not authorization to implement or deploy**.

This spec follows the merged `READ_ONLY_API_PLAN.md` and verifies the Tiniest Cloud side against its current platform guide. It intentionally creates no code path to live customer data.

## Verified Tiniest Cloud identity model

The current Tiniest Cloud guide documents:

- The browser can call `await tiny.me()`, which returns `{ id, email }` or `null`; it is not a credential to forward to the legacy API.
- A deployed backend function is called with `tiny.call("functionName", input)`.
- The function receives server-derived `tiny.caller` as `{ id, email, roles }`, or `null` for an unauthenticated visitor.
- Backend function source is not served to the browser. The function can use a named `tiny.fetch` connection; its secret is attached server-side and is not exposed to page code.
- A connection is restricted to one HTTPS host, does not follow redirects, and has request/response size and timeout limits.

**Consequence:** perform the user allowlist check inside the Tiniest backend function using `tiny.caller`, never using a caller ID/email/role supplied in the input or a browser header. Reject null callers. Keep the app's sign-in requirement enabled as a platform setting as well; it is not a substitute for the function's authorization check.

Before implementation, reconfirm these behaviours against the live Tiniest Cloud guide and the actual Data Companion app settings.

## Proposed request path

```text
Signed-in Data Companion user
  -> browser calls tiny.call("listClients", boundedInput)
  -> Tiniest backend function checks tiny.caller and server-side allowlist
  -> tiny.fetch("legacyCompanionRead", fixed path + bounded query)
  -> dedicated legacy Worker route validates a separate shared bearer secret
  -> route queries only approved columns and returns a fixed minimal schema
  -> function validates/sanitizes response and returns it to the browser
```

This is a proposal. Do not create the connection, add secrets, deploy a function, or call a live-data endpoint until the owner approves the exact user allowlist and data fields.

## Authentication and authorization layers

### Layer A — Tiniest caller authorization

- Require `tiny.caller` to exist and contain a non-empty stable `id`.
- Use a server-side allowlist of Tiniest account IDs; email may be used as an additional explicit check, not as a caller-supplied input.
- Start with one owner account only. Fail closed if the allowlist is absent, malformed, or empty.
- Apply the check on every function invocation.
- Do not trust `input.userId`, `input.email`, `input.role`, browser headers, or `tiny.me()` results for authorization.
- Return a generic denied error; do not reveal whether an ID is on the allowlist.

### Layer B — dedicated legacy endpoint

- Add a new, explicitly scoped route only after a separate review; do not change existing `/api/*` routes or their auth behaviour in this phase.
- Require a dedicated high-entropy bearer secret stored as a Worker secret. Compare safely and fail closed if unset.
- Store the matching secret in a Tiniest Cloud named connection restricted to the exact legacy API host. Never put it in frontend code, source control, function logs, or responses.
- The endpoint must be GET-only, use a fixed query and explicit field selection, enforce a small maximum page size, reject unknown parameters, and return `Cache-Control: no-store`.
- The secret proves that the request came through the configured bridge; the Tiniest function's caller allowlist determines which app users may initiate it. Do not treat the shared secret alone as per-user authorization.
- No generic proxy, arbitrary path, arbitrary SQL, writes, exports, raw mode, images, notes, addresses, or coordinates.

The existing Worker authenticates legacy users using Clerk JWTs and its current database bindings point to production data. Do not forward Tiniest identity as Clerk, weaken existing routes, or reuse a Clerk token. The proposed route is additive and must be separately reviewed and tested before any deployment.

## Initial response contract

Use the narrowest field set that satisfies the agreed screen. Proposed baseline:

```json
{
  "items": [
    {
      "id": "stable-record-id",
      "displayName": "Example",
      "shopLabel": "Example branch",
      "updatedAt": 1790000000000
    }
  ],
  "nextCursor": null
}
```

- `updatedAt` is optional and should be omitted if the UI does not need it.
- The values above are examples, not real records.
- Do not return address, lat/lng, notes, image URLs, badges, raw rows, audit details, or upstream errors.
- The server owns cursor validation and page-size limits. Cursors must not permit arbitrary sort expressions or query injection.
- Return only exact documented keys. Set `Cache-Control: no-store` on private data and avoid payload logging.

## Test-first acceptance criteria

### Tiniest backend function tests

- No caller / `tiny.caller === null` -> denied.
- Missing caller ID -> denied.
- ID not allowlisted -> denied.
- Empty, missing, or malformed allowlist -> denied.
- Input claiming an allowlisted ID/email/role while actual caller is not allowlisted -> denied.
- Allowlisted caller -> only the fixed endpoint and bounded parameters are requested.
- Upstream timeout, non-2xx response, malformed JSON, oversized response, or unexpected keys -> safe failure; no raw upstream body returned.
- Function returns only the documented response schema.

### Legacy route tests

- Missing, wrong, or empty bearer secret -> denied.
- Correct secret -> read-only response containing only approved keys.
- POST/PUT/PATCH/DELETE -> denied.
- Unknown query parameters, oversized page size, malformed cursor -> rejected.
- No address/coordinates/notes/images/raw database row in output.
- `Cache-Control: no-store` present.
- Existing legacy routes and Clerk auth tests remain unchanged.

### Rollout gates

1. Use fixture-backed tests only; no production calls.
2. Review the exact UI use case, field list, caller allowlist, retention and logging.
3. Implement the backend function on a non-live branch with mocked upstream responses.
4. Implement the dedicated Worker route in a separate PR, with tests and no deployment.
5. Review both changes together; test negative cases before positive cases.
6. Deploy only to a separately approved preview/staging environment with synthetic data.
7. Require explicit owner approval before setting live secrets or enabling production customer reads.

## Explicitly not part of this spec

No code changes, Tiniest connection creation, secrets, live data access, D1/R2 changes, DNS changes, existing route changes, production deployment, write/delete operations, or changes to the legacy Clerk flow.

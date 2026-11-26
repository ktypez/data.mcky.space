// Shared Clerk config (same instance as paper/dept/truck/portal).
// The publishable key is exposed to the browser (that's how Clerk's client
// side loads); the secret key lives in Cloudflare Pages secrets and only
// used by the functions runtime.
//
// Admin model: any signed-in Clerk user is admin.
// The old hardcoded ADMIN_EMAILS allowlist was removed — access is granted
// purely by a valid Clerk session JWT (verified against the JWKS issuer).
// NOTE: control who can write by restricting sign-ups in the Clerk dashboard
// (invite-only). Anyone who can create an account can write.
//
// Kept as a deprecated shim so old imports don't break.
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email
}

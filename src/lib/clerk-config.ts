// Shared Clerk config (same instance as paper/dept/truck/portal).
// The publishable key is exposed to the browser (that's how Clerk's client
// side loads); the secret key lives in Cloudflare Pages secrets and only
// used by the functions runtime.
//
// Admin email list — users with these emails are considered admins for write
// access. This replaces the legacy is_admin column that was part of the
// Supabase truck migration (data.mcky.space has no such column; it uses a
// single shared admin password before this migration).
//
// This list is checked against the JWT `sub` claim of the Clerk session
// token so no extra Clerk instance API round-trip is needed.
export const ADMIN_EMAILS = new Set<string>([
  'bankkh@gmail.com',
  'daily@mcky.space',
  'mcky@ezzy.com',
  'mcky@mcky.space',
  'papapun2707@gmail.com',
  'pitchy@ezzy.com',
])

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.has(email.trim().toLowerCase())
}

/* =====================================================================
   AUTH — real Clerk session, shared with me.mcky.space / paper / dept.
   The publishable key is public; the secret never reaches the browser.
   Login uses the same portal redirect as the previous data.mcky.space UI.
   ===================================================================== */
import { writable, get } from 'svelte/store';

const PUBLISHABLE_KEY =
  (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) ||
  'pk_live_Y2xlcmsubWNreS5zcGFjZSQ';

export const auth = writable({
  checking: true,
  signedIn: false,
  name: '',
  email: '',
  userId: null,
});
export const authReady = writable(false);

let clerk = null;
let initPromise = null;

export async function initAuth() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const { Clerk } = await import('@clerk/clerk-js');
      clerk = new Clerk(PUBLISHABLE_KEY);
      await clerk.load();
      const sync = () => {
        const u = clerk?.user;
        const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
        auth.set({
          checking: false,
          signedIn: !!clerk?.session,
          name: name || u?.username || '',
          email: u?.primaryEmailAddress?.emailAddress || '',
          userId: u?.id || null,
        });
      };
      clerk.addListener(sync);
      sync();
    } catch (e) {
      // Clerk unavailable (network/CSP) — app stays in guest mode.
      auth.update((s) => ({ ...s, checking: false, signedIn: false }));
    } finally {
      authReady.set(true);
    }
    return clerk;
  })();
  return initPromise;
}

export async function getToken() {
  try {
    if (!clerk?.session) return null;
    return await clerk.session.getToken();
  } catch { return null; }
}

export function login(redirect = typeof window !== 'undefined' ? window.location.href : '/') {
  const target = encodeURIComponent(redirect);
  window.location.replace(`https://me.mcky.space?from=data&redirect=${target}`);
}

export async function logout() {
  try { await clerk?.signOut(); } catch { /* session may be gone */ }
  auth.set({ checking: false, signedIn: false, name: '', email: '', userId: null });
}

export function isSignedIn() { return get(auth).signedIn; }

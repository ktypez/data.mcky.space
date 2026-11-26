import { writable } from 'svelte/store';

export const updateState = writable({ show: false, phase: 'idle' });

let started = false;
let registration = null;
let applying = false;
let reloaded = false;
let poll = 0;
let lastCheck = 0;

function onControllerChange() {
  if (!applying || reloaded) return;
  reloaded = true;
  window.location.reload();
}

async function check() {
  if (!registration || applying || !navigator.onLine ||
      document.visibilityState !== 'visible' || Date.now() - lastCheck < 30_000) return;
  lastCheck = Date.now();
  try { await registration.update(); } catch { /* retry on next event */ }
}

function onUpdateFound() {
  const worker = registration && registration.installing;
  if (!worker || applying) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) showModal(worker);
  });
}

function showModal(worker) {
  if (applying) return;
  applying = true;
  updateState.set({ show: true, phase: 'found' });
  // Auto-update: notify briefly, then hand control to the new worker.
  window.setTimeout(() => {
    updateState.set({ show: true, phase: 'applying' });
    try { worker.postMessage({ type: 'SKIP_WAITING' }); } catch { /* ignore */ }
    // Safety net if controllerchange never fires.
    window.setTimeout(() => { if (!reloaded) window.location.reload(); }, 2600);
  }, 1300);
}

export function startUpdater() {
  if (started || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  started = true;
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

  navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then((reg) => {
      registration = reg;
      reg.addEventListener('updatefound', onUpdateFound);
      if (reg.waiting && navigator.serviceWorker.controller) showModal(reg.waiting);
      poll = window.setInterval(() => { void check(); }, 5 * 60_000);
      window.addEventListener('online', check);
      window.addEventListener('pageshow', check);
      document.addEventListener('visibilitychange', check);
      void check();
    })
    .catch(() => { /* SW unsupported or blocked — app still works online */ });
}

export function stopUpdater() {
  if (!started) return;
  window.clearInterval(poll);
  window.removeEventListener('online', check);
  window.removeEventListener('pageshow', check);
  document.removeEventListener('visibilitychange', check);
  navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  started = false;
}

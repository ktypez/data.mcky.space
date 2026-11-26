import './lib/tokens.css';
import App from './App.svelte';
import { initTheme } from './lib/theme.js';
import { initSettings } from './lib/settings.js';
import { initAuth } from './lib/auth.js';
import { loadClients } from './lib/data.js';

initTheme();
initSettings();
// Live data + real Clerk session start in parallel with first paint.
loadClients();
initAuth();

const app = new App({ target: document.getElementById('app') });
export default app;

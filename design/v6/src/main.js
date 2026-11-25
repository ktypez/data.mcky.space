import './lib/tokens.css';
import App from './App.svelte';
import { initTheme } from './lib/theme.js';
import { initSettings } from './lib/settings.js';

initTheme();
initSettings();

const app = new App({ target: document.getElementById('app') });
export default app;

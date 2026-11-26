import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  // Standard preprocessor: enables <script lang="ts"> in Svelte components.
  preprocess: vitePreprocess(),
}

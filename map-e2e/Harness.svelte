<script lang="ts">
  import LocationSection from '@/components/LocationSection.svelte'
  import '@/styles/ledger.css'

  // null initially so the harness starts clean on every reload
  let lat = $state<number | null>(null)
  let lng = $state<number | null>(null)

  function handleCoordsChange(la: number | null, ln: number | null) {
    lat = la
    lng = ln
    // The coords div is read by map-e2e.mjs via CDP evalJs.
  }
</script>

<main style="width: 900px; min-height: 900px; display: flex; flex-direction: column; gap: 12px; padding: 16px; background: #15151d; color: #e2e8f0;">
  <!-- Exposed for the e2e script: coords before/after the button click. -->
  <div id="coords">{lat ?? 'null'},{lng ?? 'null'}</div>
  <LocationSection {lat} {lng} onCoordsChange={handleCoordsChange} />
</main>
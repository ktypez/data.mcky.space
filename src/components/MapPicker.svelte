<script>
  import { onMount } from 'svelte';
  import { OpenLocationCode } from 'open-location-code';
  import Icon from './Icon.svelte';

  export let lat = null;
  export let lng = null;
  export let onChange = () => {};

  const CENTER = [16.4322, 102.8236];
  const PIN_ZOOM = 16;
  const MIN_ZOOM = 10;
  const olc = new OpenLocationCode();

  let holder;
  let map = null;
  let layer = null;
  let marker = null;
  let failed = false;
  let callback = onChange;
  $: callback = onChange;

  const dark = () =>
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    (document.documentElement.getAttribute('data-theme') !== 'light' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const tileUrl = (isDark) => {
    if (isDark) return 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png';
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  };
  const attribution = () => '© OpenStreetMap contributors';

  function pinHtml(color = '#6d5ce7') {
    return `<div style="width:28px;height:28px;background:${color};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.25);"></div>`;
  }

  function place(a, b) {
    if (!map || !window.L) return;
    if (marker) marker.remove();
    marker = window.L.marker([a, b], {
      icon: window.L.divIcon({ html: pinHtml(), className: '', iconSize: [28, 28], iconAnchor: [14, 25] }),
    }).addTo(map);
  }

  onMount(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!window.L) {
          await import('leaflet');
          await import('leaflet/dist/leaflet.css');
        }
        const L = window.L;
        if (cancelled || !L || !holder) return;
        const has = lat != null && lng != null;
        map = L.map(holder, { attributionControl: false, minZoom: MIN_ZOOM })
          .setView(has ? [lat, lng] : CENTER, has ? PIN_ZOOM : 11);
        layer = L.tileLayer(tileUrl(dark()), { maxZoom: 19, detectRetina: true, attribution: attribution() }).addTo(map);
        map.on('click', (e) => {
          const a = e.latlng.lat, b = e.latlng.lng;
          callback(a, b);
          place(a, b);
          map.flyTo([a, b], Math.max(map.getZoom(), PIN_ZOOM), { duration: 0.6 });
        });
        if (has) place(lat, lng);
        setTimeout(() => { if (!cancelled) map?.invalidateSize(); }, 120);
        const pane = map.getPane('tilePane');
        if (pane) pane.style.filter = dark() ? 'invert(1) hue-rotate(180deg) brightness(.94) contrast(.86) saturate(.72)' : '';
      } catch {
        if (!cancelled) failed = true;
      }
    })();
    return () => {
      cancelled = true;
      try { map?.remove(); } catch { /* ignore */ }
      map = null; marker = null; layer = null;
    };
  });

  $: if (map && lat != null && lng != null) {
    if (marker) marker.setLatLng([lat, lng]);
    else place(lat, lng);
  }
</script>

<div class="map-wrap">
  {#if failed}
    <div class="map-fail">ไม่สามารถโหลดแผนที่ได้</div>
  {:else}
    <div class="map" bind:this={holder}></div>
    {#if lat != null && lng != null}
      <div class="readout">
        <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
        <i></i>
        <b>{olc.encode(lat, lng, 10)}</b>
      </div>
    {/if}
  {/if}
</div>

<style>
  .map-wrap { position: relative; width: 100%; height: 190px; border: 1px solid var(--line); border-radius: var(--r-sm); overflow: hidden; background: var(--paper-3); }
  .map { width: 100%; height: 100%; }
  .map :global(.leaflet-container) { font: inherit; }
  .map-fail { width: 100%; height: 100%; display: grid; place-items: center; color: var(--ink-3); font-size: var(--fs-xs); }
  .readout {
    position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); z-index: 500;
    display: flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 8px;
    background: color-mix(in srgb, var(--paper) 88%, transparent); backdrop-filter: blur(6px);
    border: 1px solid var(--line); font-size: var(--fs-2xs); white-space: nowrap; pointer-events: none;
  }
  .readout span { font-family: var(--font-fun); }
  .readout i { width: 1px; height: 12px; background: var(--line-2); }
  .readout b { color: var(--pri); letter-spacing: .04em; }
</style>

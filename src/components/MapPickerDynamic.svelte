<script lang="ts">
  import MapPicker from './MapPicker.svelte'
  let { lat, lng, onChange }: { lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void } = $props()
</script>

<MapPicker {lat} {lng} {onChange} />

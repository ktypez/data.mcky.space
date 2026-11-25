<script>
  export let name = '';
  export let size = 44;

  // deterministic pastel hue from the name -> varied but stable avatars
  function hueOf(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }
  $: char = (name || '?').trim().charAt(0) || '?';
  $: hue = hueOf(name || '?');
  // tinted chip that works in both themes via color-mix
  $: style = `
    --m-hue: ${hue};
    width:${size}px; height:${size}px; font-size:${Math.round(size * 0.42)}px;
    background: color-mix(in srgb, hsl(${hue} 78% 58%) 16%, var(--paper-2));
    color: color-mix(in srgb, hsl(${hue} 64% 38%) 78%, var(--ink));
  `;
</script>

<span class="mono" {style}>{char}</span>

<style>
  .mono {
    display: inline-grid;
    place-items: center;
    border-radius: var(--r-md);
    font-family: var(--font-display);
    font-weight: 700;
    line-height: 1;
    user-select: none;
    flex: none;
  }
</style>

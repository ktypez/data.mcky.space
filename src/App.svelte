<script>
  import { onMount } from 'svelte';
  import { view, cmdOpen, selected, setView, toggleCmd, closeCmd, openRecord, closeRecord } from './lib/ui.js';
  import { toggleTheme, cyclePalette } from './lib/theme.js';
  import { clients } from './lib/data.js';

  import TopBar from './components/TopBar.svelte';
  import Ledger from './views/Ledger.svelte';
  import Settings from './views/Settings.svelte';
  import Record from './components/Record.svelte';
  import CommandPalette from './components/CommandPalette.svelte';
  import EffectLayer from './components/EffectLayer.svelte';
  import Toaster from './components/Toaster.svelte';

  $: recents = [...$clients].sort((a, b) => b.updatedTs - a.updatedTs).slice(0, 6);
  $: commands = [
    { id: 'go-ledger', label: 'ไปที่ สมุดทะเบียน', icon: 'book', group: 'นำทาง', hint: ['G', 'L'], run: () => setView('ledger') },
    { id: 'go-settings', label: 'ไปที่ ตั้งค่า', icon: 'settings', group: 'นำทาง', hint: ['G', 'S'], run: () => setView('settings') },
    { id: 'toggle-theme', label: 'สลับโหมด สว่าง / มืด', icon: 'moon', group: 'ธีม', hint: ['T'], run: () => toggleTheme() },
    { id: 'cycle-pal', label: 'เปลี่ยนธีมสีถัดไป', icon: 'palette', group: 'ธีม', hint: ['P'], run: () => cyclePalette() },
    ...recents.map(c => ({
      id: 'c-' + c.id,
      label: c.name,
      icon: 'book',
      group: 'ลูกค้า (ล่าสุด)',
      keywords: c.customer || '',
      run: () => { setView('ledger'); openRecord(c); }
    }))
  ];

  function onKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleCmd();
    } else if (e.key === 'Escape') {
      if ($cmdOpen) closeCmd();
      else if ($selected) closeRecord();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

<TopBar />

<main>
  {#if $view === 'ledger'}
    <Ledger />
  {:else}
    <Settings />
  {/if}
</main>

{#if $selected}
  <Record client={$selected} on:close={closeRecord} />
{/if}

<CommandPalette open={$cmdOpen} {commands} on:close={closeCmd} />
<EffectLayer />
<Toaster />

<style>
  main { min-height: calc(100vh - var(--topbar-h)); }
</style>

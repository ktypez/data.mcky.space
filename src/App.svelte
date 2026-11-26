<script>
  import { onMount } from 'svelte';
  import { view, cmdOpen, selected, editing, setView, toggleCmd, closeCmd, openRecord, closeRecord, openEditor } from './lib/ui.js';
  import { toggleTheme, cyclePalette } from './lib/theme.js';
  import { clients } from './lib/data.js';
  import { auth } from './lib/auth.js';

  import TopBar from './components/TopBar.svelte';
  import Ledger from './views/Ledger.svelte';
  import Settings from './views/Settings.svelte';
  import Tokens from './views/Tokens.svelte';
  import Editor from './views/Editor.svelte';
  import Trash from './views/Trash.svelte';
  import Record from './components/Record.svelte';
  import CommandPalette from './components/CommandPalette.svelte';
  import EffectLayer from './components/EffectLayer.svelte';
  import Toaster from './components/Toaster.svelte';
  import EntrySplash from './components/EntrySplash.svelte';
  import UpdateModal from './components/UpdateModal.svelte';
  import { startUpdater, stopUpdater } from './lib/updater.js';

  $: recents = [...$clients].sort((a, b) => b.updatedTs - a.updatedTs).slice(0, 6);
  $: commands = [
    { id: 'go-ledger', label: 'ไปที่ สมุดทะเบียน', icon: 'book', group: 'นำทาง', hint: ['G', 'L'], run: () => setView('ledger') },
    { id: 'go-settings', label: 'ไปที่ ตั้งค่า', icon: 'settings', group: 'นำทาง', hint: ['G', 'S'], run: () => setView('settings') },
    ...($auth.signedIn ? [{ id: 'go-trash', label: 'ไปที่ ถังขยะ', icon: 'trash', group: 'นำทาง', hint: ['G', 'T'], run: () => setView('trash') }] : []),
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
    startUpdater();
    window.addEventListener('keydown', onKey);
    // Deep link: ?c=<id> opens that record in the side sheet once data loads.
    let unsub = () => {};
    const params = new URLSearchParams(window.location.search);
    const id = params.get('c');
    if (params.get('view') === 'tokens') setView('tokens');
    if (params.get('view') === 'trash' && $auth.signedIn) setView('trash');
    const editId = params.get('edit');
    if (editId && $auth.signedIn) {
      let openedEdit = false;
      unsub = clients.subscribe((list) => {
        if (openedEdit) return;
        const match = list.find((c) => c.id === editId);
        if (match) { openedEdit = true; openEditor(match); }
      });
    } else if (id) {
      let opened = false;
      unsub = clients.subscribe((list) => {
        if (opened) return;
        const match = list.find((c) => c.id === id);
        if (match) { opened = true; openRecord(match); }
      });
    }
    return () => {
      stopUpdater();
      window.removeEventListener('keydown', onKey);
      unsub();
    };
  });
</script>

<TopBar />
<EntrySplash />

<main>
  {#if $view === 'ledger'}
    <Ledger />
  {:else if $view === 'settings'}
    <Settings />
  {:else if $view === 'tokens'}
    <Tokens />
  {:else if $view === 'trash'}
    <Trash />
  {/if}
</main>

{#if $selected && !$editing}
  <Record client={$selected} on:close={closeRecord} />
{/if}

{#if $editing}
  <Editor />
{/if}

<CommandPalette open={$cmdOpen} {commands} on:close={closeCmd} />
<EffectLayer />
<Toaster />
<UpdateModal />

<style>
  main {
    height: calc(100dvh - var(--topbar-h));
    min-height: 0;
    overflow-y: auto;
    /* main is the scroll container so the in-page search can be sticky
       directly under the top bar (same recipe as the old ledger). */
  }
</style>

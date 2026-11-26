<script>
  import { PALETTES, palette, setPalette, toggleTheme } from '../lib/theme.js';
  import { view, setView, openCmd } from '../lib/ui.js';
  import Icon from './Icon.svelte';
  import Kbd from './Kbd.svelte';
  import Asterisk from './Asterisk.svelte';
  import { theme } from '../lib/theme.js';

  const nav = [
    { id: 'ledger', label: 'สมุดทะเบียน', icon: 'book' },
    { id: 'settings', label: 'ตั้งค่า', icon: 'settings' }
  ];

  function pickPalette(id) { setPalette(id); }
</script>

<header class="bar">
  <div class="wrap bar-inner">
    <button class="brand" on:click={() => setView('ledger')}>
      <span class="logo"><Asterisk size={16} color="var(--pri-ink)" /></span>
      <span class="word">
        <b>DATA</b>
        <small>Ledger</small>
      </span>
    </button>

    <nav class="nav">
      {#each nav as n}
        <button class="nav-btn {n.id === $view ? 'on' : ''}" on:click={() => setView(n.id)}>
          <Icon name={n.icon} size={16} />
          {n.label}
        </button>
      {/each}
    </nav>

    <div class="actions">
      <div class="pal-dots" role="group" aria-label="เปลี่ยนธีม">
        {#each PALETTES as p}
          <button
            class="dot {p.id === $palette ? 'on' : ''}"
            style="--h:{p.hue}"
            title={p.label}
            aria-label={p.label}
            on:click={() => pickPalette(p.id)}
          ></button>
        {/each}
      </div>

      <button class="icon-btn" on:click={toggleTheme} aria-label="สลับโหมด">
        <Icon name={$theme === 'dark' ? 'sun' : 'moon'} size={18} />
      </button>

      <button class="cmd-btn" on:click={openCmd}>
        <Icon name="search" size={16} />
        <span class="cmd-label">ค้นหา</span>
        <Kbd keys={['⌘', 'K']} />
      </button>
    </div>
  </div>
</header>

<style>
  .bar {
    position: sticky; top: 0; z-index: 100;
    background: color-mix(in srgb, var(--paper) 82%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--line);
  }
  .bar-inner { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; height: var(--topbar-h); }
  .brand {
    display: flex; align-items: center; gap: 10px; border: none; background: none; padding: 0;
    justify-self: start;
  }
  .logo {
    width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center;
    background: var(--pri-fill); box-shadow: 0 3px 10px hsl(var(--hue-pri) 60% 78% / .5);
    flex: none;
  }
  .word { display: flex; flex-direction: column; line-height: 1; text-align: left; }
  .word b { font-family: var(--font-display); font-size: 15px; font-weight: 700; letter-spacing: .04em; }
  .word small { font-size: 9px; color: var(--ink-3); font-weight: 600; letter-spacing: .12em; text-transform: uppercase; }

  .nav { display: flex; gap: 3px; background: var(--paper-3); border: 1px solid var(--line); border-radius: var(--r-pill); padding: 3px; justify-self: center; }
  .nav-btn {
    display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent;
    padding: 5px 12px; border-radius: var(--r-pill); color: var(--ink-2); font-weight: 600; font-size: var(--fs-xs);
    transition: background var(--dur) var(--ease-out), color var(--dur) var(--ease-out);
  }
  .nav-btn.on { background: var(--paper-2); color: var(--pri); box-shadow: var(--shadow-sm); }

  .actions { display: flex; align-items: center; gap: 8px; justify-self: end; }
  .pal-dots { display: flex; gap: 5px; background: var(--paper-3); border: 1px solid var(--line); padding: 5px; border-radius: var(--r-pill); }
  .dot {
    width: 15px; height: 15px; border-radius: 50%; border: 2px solid transparent;
    background: hsl(var(--h) 62% 78%); cursor: pointer; transition: transform var(--dur-fast) var(--ease-spring);
  }
  .dot:hover { transform: scale(1.18); }
  .dot.on { border-color: var(--ink); box-shadow: 0 0 0 2px var(--paper-2); }

  .icon-btn {
    width: 34px; height: 34px; border-radius: var(--r-pill); border: 1px solid var(--line);
    background: var(--paper-2); color: var(--ink-2); display: grid; place-items: center;
    transition: background var(--dur) var(--ease-out), color var(--dur) var(--ease-out), transform var(--dur-fast) var(--ease-spring);
  }
  .icon-btn:hover { color: var(--pri); border-color: color-mix(in srgb, var(--pri) 40%, transparent); transform: translateY(-1px); }

  .cmd-btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; height: 34px;
    border-radius: var(--r-pill); border: 1px solid var(--line); background: var(--paper-2); color: var(--ink-2);
    font-weight: 600; font-size: var(--fs-sm);
    transition: border-color var(--dur) var(--ease-out), color var(--dur) var(--ease-out), transform var(--dur-fast) var(--ease-spring);
  }
  .cmd-btn:hover { border-color: var(--pri); color: var(--pri); transform: translateY(-1px); }
  .cmd-label { display: none; }
  @media (min-width: 560px) { .cmd-label { display: inline; } }

  @media (max-width: 560px) {
    .nav-btn { font-size: 0; gap: 0; padding: 9px; }
    .nav-btn :global(svg) { width: 18px; height: 18px; }
    .word small { display: none; }
  }
</style>

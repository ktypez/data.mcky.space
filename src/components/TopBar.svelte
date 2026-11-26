<script>
  import { view, setView } from '../lib/ui.js';
  import Icon from './Icon.svelte';
  import Asterisk from './Asterisk.svelte';
  import { theme, toggleTheme } from '../lib/theme.js';
  import { auth, login, logout } from '../lib/auth.js';

  const nav = [
    { id: 'ledger', label: 'สมุดทะเบียน', icon: 'book' },
    { id: 'settings', label: 'ตั้งค่า', icon: 'settings' }
  ];
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
      <button class="icon-btn" on:click={toggleTheme} aria-label="สลับโหมด">
        <Icon name={$theme === 'dark' ? 'sun' : 'moon'} size={18} />
      </button>

      {#if $auth.signedIn}
        <button class="auth-btn" on:click={logout} title={$auth.email || 'ออกจากระบบ'}>
          <span class="who">{$auth.name || 'ผู้ใช้'}</span>
          <Icon name="arrow-right" size={15} />
        </button>
      {:else if !$auth.checking}
        <button class="auth-btn" on:click={() => login()} title="เข้าสู่ระบบด้วยบัญชี mcky">
          <span class="who">เข้าสู่ระบบ</span>
        </button>
      {/if}
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
  .bar-inner { display: flex; align-items: center; gap: 16px; height: var(--topbar-h); }
  .brand {
    display: flex; align-items: center; gap: 10px; border: none; background: none; padding: 0;
  }
  .logo {
    width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center;
    background: var(--pri-fill); box-shadow: 0 3px 10px hsl(var(--hue-pri) 60% 78% / .5);
    flex: none;
  }
  .word { display: flex; flex-direction: column; line-height: 1; text-align: left; }
  .word b { font-family: var(--font-display); font-size: 15px; font-weight: 700; letter-spacing: .04em; }
  .word small { font-size: 9px; color: var(--ink-3); font-weight: 600; letter-spacing: .12em; text-transform: uppercase; }

  .nav { display: flex; gap: 3px; background: var(--paper-3); border: 1px solid var(--line); border-radius: var(--r-pill); padding: 3px; }
  .nav-btn {
    display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent;
    padding: 5px 12px; border-radius: var(--r-pill); color: var(--ink-2); font-weight: 600; font-size: var(--fs-xs);
    transition: background var(--dur) var(--ease-out), color var(--dur) var(--ease-out);
  }
  .nav-btn.on { background: var(--paper-2); color: var(--pri); box-shadow: var(--shadow-sm); }

  .actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }

  .icon-btn {
    width: 34px; height: 34px; border-radius: var(--r-pill); border: 1px solid var(--line);
    background: var(--paper-2); color: var(--ink-2); display: grid; place-items: center;
    transition: background var(--dur) var(--ease-out), color var(--dur) var(--ease-out), transform var(--dur-fast) var(--ease-spring);
  }
  .icon-btn:hover { color: var(--pri); border-color: color-mix(in srgb, var(--pri) 40%, transparent); transform: translateY(-1px); }

  .auth-btn {
    display: inline-flex; align-items: center; gap: 6px; height: 34px;
    padding: 0 12px; border-radius: var(--r-pill); border: 1px solid var(--line);
    background: var(--pri-fill); color: var(--pri-ink); font-weight: 700; font-size: var(--fs-xs);
    transition: background var(--dur) var(--ease-out), transform var(--dur-fast) var(--ease-spring);
  }
  .auth-btn:hover { background: var(--pri-fill-hov); transform: translateY(-1px); }
  .auth-btn .who { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @media (max-width: 560px) {
    .nav-btn { font-size: 0; gap: 0; padding: 9px; }
    .nav-btn :global(svg) { width: 18px; height: 18px; }
    .word small { display: none; }
    .auth-btn .who { max-width: 84px; }
  }
</style>

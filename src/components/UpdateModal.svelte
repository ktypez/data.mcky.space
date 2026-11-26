<script>
  import { updateState } from '../lib/updater.js';
  import Asterisk from './Asterisk.svelte';
</script>

{#if $updateState.show}
  <div class="scrim" role="presentation">
    <div class="modal" role="alertdialog" aria-modal="true" aria-label="อัปเดตแอป">
      <span class="mark"><Asterisk size={30} color="var(--pri)" spin /></span>
      <h2>{$updateState.phase === 'applying' ? 'กำลังอัปเดต…' : 'มีเวอร์ชันใหม่'}</h2>
      <p>
        {$updateState.phase === 'applying'
          ? 'กำลังติดตั้งและรีเฟรชแอปอัตโนมัติ'
          : 'แอปจะอัปเดตอัตโนมัติในอีกครู่หนึ่ง'}
      </p>
      <div class="track"><i></i></div>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 11000;
    display: grid;
    place-items: center;
    padding: 20px;
    background: var(--scrim);
    animation: fade .18s var(--ease-out) both;
  }
  .modal {
    width: min(92vw, 340px);
    padding: 24px 24px 20px;
    border: 1px solid var(--line);
    border-radius: var(--r-lg);
    background: var(--paper);
    text-align: center;
    box-shadow: var(--shadow-lg);
    animation: pop .26s var(--ease-spring) both;
  }
  .mark { display: inline-grid; place-items: center; margin-bottom: 10px; }
  h2 { margin: 0 0 6px; font-size: var(--fs-xl); color: var(--ink); }
  p { margin: 0; font-size: var(--fs-sm); color: var(--ink-3); }
  .track {
    margin-top: 16px;
    height: 6px;
    border-radius: var(--r-pill);
    background: var(--pri-soft);
    overflow: hidden;
  }
  .track i {
    display: block;
    height: 100%;
    width: 45%;
    border-radius: inherit;
    background: var(--acc);
    animation: slide 1.1s var(--ease-out) infinite;
  }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pop { from { opacity: 0; transform: scale(.92) translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes slide { 0% { transform: translateX(-120%); } 100% { transform: translateX(360%); } }
  @media (prefers-reduced-motion: reduce) {
    .scrim, .modal, .track i { animation: none; }
  }
</style>

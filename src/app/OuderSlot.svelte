<script lang="ts">
  /** Slot voor de ouderhoek: 3 seconden vasthouden en dan een keersom. */
  import { getal, schud } from '../engine/toeval';

  let { opOpen }: { opOpen: () => void } = $props();

  let voortgang = $state(0);
  let timer: ReturnType<typeof setInterval> | null = null;
  let vraag: { a: number; b: number; keuzes: number[] } | null = $state(null);

  function start() {
    stop();
    const begin = Date.now();
    timer = setInterval(() => {
      voortgang = Math.min(1, (Date.now() - begin) / 3000);
      if (voortgang >= 1) {
        stop();
        const a = getal(6, 9);
        const b = getal(6, 9);
        const antwoord = a * b;
        vraag = { a, b, keuzes: schud([antwoord, antwoord + a, antwoord - b, antwoord + 10]) };
      }
    }, 50);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    voortgang = 0;
  }
  function kies(k: number) {
    if (vraag && k === vraag.a * vraag.b) opOpen();
    vraag = null;
  }
</script>

<button
  class="slot"
  aria-label="Ouderhoek (3 seconden vasthouden)"
  onpointerdown={start}
  onpointerup={stop}
  onpointerleave={stop}
  onpointercancel={stop}
  oncontextmenu={(e) => e.preventDefault()}
>
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="4" />
    <circle
      cx="24"
      cy="24"
      r="21"
      fill="none"
      stroke="#fde68a"
      stroke-width="4"
      stroke-dasharray={2 * Math.PI * 21}
      stroke-dashoffset={2 * Math.PI * 21 * (1 - voortgang)}
      transform="rotate(-90 24 24)"
    />
    <rect x="16" y="22" width="16" height="12" rx="2" fill="rgba(255,255,255,0.6)" />
    <path d="M19 22 v-4 a5 5 0 0 1 10 0 v4" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" fill="none" />
  </svg>
</button>

{#if vraag}
  <div class="scherm" role="dialog" aria-modal="true">
    <div class="kaart">
      <p>Voor ouders: hoeveel is {vraag.a} × {vraag.b}?</p>
      <div class="knoppen">
        {#each vraag.keuzes as k}
          <button onclick={() => kies(k)}>{k}</button>
        {/each}
      </div>
      <button class="sluit" onclick={() => (vraag = null)}>Annuleren</button>
    </div>
  </div>
{/if}

<style>
  .slot {
    width: 56px;
    height: 56px;
    padding: 0;
  }
  .slot svg {
    width: 100%;
    height: 100%;
  }
  .scherm {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    background: rgba(3, 18, 60, 0.75);
  }
  .kaart {
    padding: 32px 40px;
    border-radius: 24px;
    background: #f8fafc;
    color: #0f172a;
    font-family: system-ui, sans-serif;
    text-align: center;
  }
  p {
    font-size: 24px;
    margin: 0 0 20px;
  }
  .knoppen {
    display: flex;
    gap: 12px;
  }
  .knoppen button {
    min-width: 90px;
    min-height: 64px;
    border-radius: 14px;
    font-size: 26px;
    background: #e2e8f0;
    color: #0f172a;
  }
  .sluit {
    margin-top: 18px;
    color: #475569;
    font-size: 18px;
    text-decoration: underline;
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import Heldin from '../art/Held.svelte';
  import { spreek } from '../audio/stem';
  import { speelFanfare } from '../audio/geluid';
  import { grootFeest } from '../ui/feest';
  import teksten from '../../content/teksten.json';
  import StickerKaart from '../ui/StickerKaart.svelte';
  import type { StickerWinst } from '../store/plakboek.svelte';
  import { vg } from '../store/voortgang.svelte';
  import { beloning } from '../games/teksten';
  import type { HeldinId } from '../store/voortgang.svelte';

  let {
    heldin,
    goed,
    totaal,
    noten,
    sticker = null,
    omhoog,
    titel = 'Gelukt!',
    melding,
    pauze = false,
    missie = null,
    opVerder,
    opNogEens,
    opTerug,
    opPauze = opTerug,
    opWinkel,
    opPlakboek,
  }: {
    heldin: HeldinId;
    goed: number;
    totaal: number;
    noten: number;
    /** De sticker die hij met deze ronde verdiende. */
    sticker?: StickerWinst | null;
    omhoog: boolean;
    titel?: string;
    /** Extra regel, bijv. het startniveau na de auditie. */
    melding?: string;
    /** Speeltijd om: alleen nog een knop naar het pauzescherm. */
    pauze?: boolean;
    opPauze?: () => void;
    /** Bij een dagmissie: welk spel is dit (stap) van hoeveel? */
    missie?: { stap: number; totaal: number } | null;
    opVerder?: () => void;
    opNogEens: () => void;
    opTerug: () => void;
    /** Naar de Turbo-winkel. */
    opWinkel?: () => void;
    opPlakboek?: () => void;
  } = $props();

  let stickerOpen = $state(false);
  let sterren = $derived(totaal === 0 ? 3 : goed / totaal >= 0.85 ? 3 : goed / totaal >= 0.6 ? 2 : 1);
  const anderen = (['sonic', 'tails', 'knuckles'] as HeldinId[]).filter((h) => h !== heldin);

  onMount(() => {
    speelFanfare();
    grootFeest();
    void (async () => {
      await spreek(missie ? teksten.missie.volgende : melding ? teksten.auditie.klaar : beloning());
      if (sticker) {
        stickerOpen = true;
        const pb = teksten.plakboek;
        await spreek(sticker.glim && !sticker.dubbel ? pb.glim : sticker.nieuw ? pb.nieuw : pb.dubbel);
        await spreek(sticker.woord, 'woord');
        if (sticker.bladzijdeVol) await spreek(pb.vol);
      }
      if (pauze) await spreek(teksten.pauze.tijd);
    })();
  });
</script>

<div class="scherm">
  {#if sticker}
    <button class="sticker-plek" class:open={stickerOpen} onclick={() => opPlakboek?.()} aria-label="Nieuwe sticker: {sticker.woord}. Open je plakboek">
      <span class="lint">{sticker.dubbel ? 'Dubbel! +5 ringen' : sticker.glim ? '✨ Glimmer!' : 'Nieuwe sticker!'}</span>
      <StickerKaart woord={sticker.woord} glim={sticker.glim} grootte={150} kantel={6} />
      <span class="naar">📒</span>
    </button>
  {/if}
  <div class="kaart">
    <p class="groet">Goed gedaan, Lucas!</p>
    <h2 class="goudtekst">{titel}</h2>

    <div class="sterren">
      {#each [1, 2, 3] as s}
        <svg viewBox="0 0 100 100" class:aan={s <= sterren} style="animation-delay:{0.3 + s * 0.25}s" aria-hidden="true">
          <path
            d="M50 5 l13 27 30 4 -22 21 5 30 -26 -14 -26 14 5 -30 -22 -21 30 -4z"
            fill={s <= sterren ? '#fbbf24' : 'rgba(255,255,255,0.15)'}
            stroke={s <= sterren ? '#fff7c2' : 'rgba(255,255,255,0.3)'}
            stroke-width="4"
            stroke-linejoin="round"
          />
        </svg>
      {/each}
    </div>

    <div class="groep">
      <Heldin wie={anderen[0]} stemming="dans" hoogte={265} />
      <Heldin wie={heldin} stemming="juich" hoogte={315} />
      <Heldin wie={anderen[1]} stemming="dans" hoogte={265} />
    </div>

    <div class="noten">+{noten} gouden ringen</div>

    {#if melding}
      <div class="omhoog">{melding}</div>
    {/if}
    {#if omhoog}
      <div class="omhoog">🎉 Level omhoog! Jij wordt steeds sterker!</div>
    {/if}

    {#if missie}
      <div class="stappen" aria-label="Missie: spel {missie.stap + 1} van {missie.totaal}">
        {#each Array.from({ length: missie.totaal }) as _, i}
          <span class="stap" class:klaar={i <= missie.stap}>{i <= missie.stap ? '⭐' : '○'}</span>
        {/each}
      </div>
      <div class="knoppen">
        <button class="knop-goud groot icoonknop" onclick={opVerder} aria-label={missie.stap + 1 < missie.totaal ? 'Volgende spel' : 'Pak je kristal'}>{missie.stap + 1 < missie.totaal ? '➡️' : '💎'}</button>
      </div>
    {:else if pauze}
      <div class="pauze">☕</div>
      <div class="knoppen">
        <button class="knop-goud icoonknop" onclick={opPauze} aria-label="Klaar voor vandaag">👋</button>
      </div>
    {:else}
      <div class="knoppen">
        <button class="knop-goud ander icoonknop" onclick={opTerug} aria-label="Ander spel">🎮</button>
        {#if opWinkel && vg.ringen >= 25}
          <button class="knop-goud winkel icoonknop" onclick={opWinkel} aria-label="Winkel">🛒</button>
        {/if}
        <button class="knop-goud icoonknop" onclick={opNogEens} aria-label="Nog een keer">🔁</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .scherm {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    background: radial-gradient(circle, rgba(8, 40, 110, 0.85), rgba(3, 18, 60, 0.92));
    animation: fade 0.4s ease-out;
  }
  .kaart {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 20px 60px 30px;
  }
  .groet {
    margin: 0;
    font-size: 34px;
    font-weight: 600;
    color: #fde68a;
    text-shadow: 0 0 18px rgba(251, 191, 36, 0.8);
    animation: pop-in 0.5s ease-out;
  }
  h2 {
    margin: 0;
    font-size: 72px;
    animation: pop-in 0.6s ease-out;
  }
  .sterren {
    display: flex;
    gap: 18px;
  }
  .sterren svg {
    width: 72px;
    height: 72px;
    animation: pop-in 0.5s ease-out backwards;
  }
  .sterren svg.aan {
    filter: drop-shadow(0 0 16px rgba(251, 191, 36, 0.9));
  }
  .groep {
    display: flex;
    align-items: end;
    gap: 22px;
  }
  .noten {
    font-size: 36px;
    font-weight: 700;
    color: #fde68a;
    text-shadow: 0 0 16px rgba(251, 191, 36, 0.8);
  }
  .sticker-plek {
    position: absolute;
    right: 46px;
    top: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 0;
    background: none;
    border: 0;
    transform: translateY(-50%) rotateY(90deg);
    transition: transform 0.6s cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .sticker-plek.open {
    transform: translateY(-50%) rotateY(0);
  }
  .lint {
    padding: 4px 16px;
    border-radius: 999px;
    font-size: 24px;
    font-weight: 700;
    background: linear-gradient(90deg, #f472b6, #a855f7);
    box-shadow: 0 0 18px rgba(244, 114, 182, 0.7);
  }
  .naar {
    font-size: 22px;
    font-weight: 700;
    color: #fbcfe8;
  }
  .winkel {
    background: linear-gradient(180deg, #c4b5fd, #7c3aed);
    box-shadow: 0 6px 0 #3b0f7a;
    color: #fff;
  }
  .omhoog {
    padding: 6px 22px;
    border-radius: 999px;
    background: linear-gradient(90deg, #f59e0b, #3b82f6);
    font-size: 26px;
    font-weight: 600;
    animation: pop-in 0.6s ease-out 1s backwards;
  }
  .stappen {
    display: flex;
    gap: 14px;
    font-size: 40px;
    animation: pop-in 0.6s ease-out 1s backwards;
  }
  .stap:not(.klaar) {
    opacity: 0.4;
  }
  .groot {
    min-width: 340px;
  }
  .pauze {
    font-size: 30px;
    font-weight: 700;
    color: #a5f3fc;
    text-shadow: 0 0 14px rgba(6, 182, 212, 0.8);
    animation: pop-in 0.6s ease-out 1.2s backwards;
  }
  .knoppen {
    display: flex;
    gap: 26px;
    margin-top: 14px;
  }
  .ander {
    background: linear-gradient(180deg, #eff6ff, #93c5fd);
    box-shadow: 0 6px 0 #1e40af;
    color: #172554;
  }
  @keyframes fade {
    from { opacity: 0; }
  }
</style>

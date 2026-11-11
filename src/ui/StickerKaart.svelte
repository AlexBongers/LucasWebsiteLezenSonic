<script lang="ts">
  /** Eén sticker: plaatje met het woordje eronder, een witte rand en (soms) een glimmende regenboog. */
  import { emojiVan } from '../games/stickers';

  let {
    woord,
    glim = false,
    leeg = false,
    grootte = 140,
    aantal = 0,
    kantel = 0,
  }: { woord: string; glim?: boolean; leeg?: boolean; grootte?: number; aantal?: number; kantel?: number } = $props();
</script>

<div class="sticker" class:glim class:leeg style="--g:{grootte}px; transform: rotate({kantel}deg)">
  <span class="emoji">{emojiVan(woord)}</span>
  {#if !leeg}
    <span class="woord">{woord}</span>
  {:else}
    <span class="woord vraag">?</span>
  {/if}
  {#if glim && !leeg}<span class="glans" aria-hidden="true"></span>{/if}
  {#if aantal > 1 && !leeg}<span class="aantal">×{aantal}</span>{/if}
</div>

<style>
  .sticker {
    position: relative;
    width: var(--g);
    height: calc(var(--g) * 1.12);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border-radius: calc(var(--g) * 0.18);
    background: radial-gradient(circle at 35% 25%, #ffffff, #f1f5f9 70%);
    border: calc(var(--g) * 0.05) solid #fff;
    box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.18), 0 6px 14px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }
  .emoji {
    font-size: calc(var(--g) * 0.5);
    line-height: 1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
    filter: drop-shadow(0 3px 3px rgba(0, 0, 0, 0.25));
  }
  .woord {
    font-family: var(--font-lees);
    font-size: calc(var(--g) * 0.2);
    font-weight: 700;
    color: #1e293b;
    line-height: 1;
  }
  .glim {
    background: conic-gradient(from 0deg, #fecaca, #fde68a, #bbf7d0, #bae6fd, #ddd6fe, #fbcfe8, #fecaca);
    box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.18), 0 0 18px rgba(253, 224, 71, 0.9), 0 6px 14px rgba(0, 0, 0, 0.3);
  }
  .glans {
    position: absolute;
    inset: -40%;
    background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.85) 50%, transparent 60%);
    animation: glans 2.6s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes glans {
    0% { transform: translateX(-60%); }
    60%, 100% { transform: translateX(60%); }
  }
  .leeg {
    background: rgba(255, 255, 255, 0.08);
    border: calc(var(--g) * 0.03) dashed rgba(100, 116, 139, 0.6);
    box-shadow: none;
  }
  .leeg .emoji {
    filter: brightness(0) opacity(0.14);
  }
  .vraag {
    color: rgba(100, 116, 139, 0.7);
  }
  .aantal {
    position: absolute;
    right: 6px;
    top: 4px;
    padding: 0 7px;
    border-radius: 999px;
    font-size: calc(var(--g) * 0.13);
    font-weight: 700;
    color: #fff;
    background: #7c3aed;
  }
</style>

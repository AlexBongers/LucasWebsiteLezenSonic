<script lang="ts">
  let {
    vraag,
    ja = 'Ja',
    nee = 'Nee',
    opJa,
    opNee,
  }: { vraag: string; ja?: string; nee?: string; opJa: () => void; opNee: () => void } = $props();
</script>

<div class="scherm" role="dialog" aria-modal="true">
  <div class="kaart">
    <p>{vraag}</p>
    <div class="knoppen">
      <button class="knop-goud nee" onclick={opNee}>{nee}</button>
      <button class="knop-goud" onclick={opJa}>{ja}</button>
    </div>
  </div>
</div>

<style>
  .scherm {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    background: rgba(3, 18, 60, 0.7);
    backdrop-filter: blur(4px);
  }
  .kaart {
    padding: 40px 56px;
    border-radius: 32px;
    background: linear-gradient(160deg, #172554, #0b2a6f);
    border: 3px solid rgba(253, 230, 138, 0.6);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    text-align: center;
    animation: pop-in 0.35s ease-out;
  }
  p {
    font-size: 36px;
    margin: 0 0 32px;
  }
  .knoppen {
    display: flex;
    gap: 28px;
    justify-content: center;
  }
  .nee {
    background: linear-gradient(180deg, #e0f2fe, #93c5fd);
    box-shadow: 0 6px 0 #1e40af;
    color: #172554;
  }
</style>

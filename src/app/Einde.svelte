<script lang="ts">
  /** Sessie-einde: de speeltijd is om, de heldinnen zwaaien gedag. */
  import { onMount } from 'svelte';
  import Heldin from '../art/Held.svelte';
  import { spreek } from '../audio/stem';
  import teksten from '../../content/teksten.json';
  import { vg } from '../store/voortgang.svelte';

  let { sinds, opOpnieuw }: { sinds: number; opOpnieuw: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const vandaag = vg.sessies.filter((s) => new Date(s.datum).getTime() >= sinds);
  const noten = vandaag.reduce((t, s) => t + s.ringen, 0);
  const goed = vandaag.reduce((t, s) => t + s.goed, 0);

  onMount(() => {
    void spreek(teksten.pauze.tot);
  });
</script>

<div class="einde">
  <h1 class="goudtekst">Goed geoefend, Lucas!</h1>
  <p class="sub">Alle robots zijn kapot. Rust maar lekker uit.</p>

  <div class="groep">
    <Heldin wie="sonic" stemming="juich" hoogte={340} />
    <Heldin wie="tails" stemming="dans" hoogte={370} />
    <Heldin wie="knuckles" stemming="juich" hoogte={340} />
  </div>

  <div class="tellers">
    <div><strong>{vandaag.length}</strong><span>{vandaag.length === 1 ? 'ronde' : 'rondes'}</span></div>
    <div><strong>{goed}</strong><span>meteen goed</span></div>
    <div><strong>+{noten}</strong><span>gouden ringen</span></div>
  </div>

  <p class="sluit">Je kunt de app nu sluiten met de knop van de tablet.</p>
  <button class="opnieuw" onclick={opOpnieuw}>Naar het begin</button>
</div>

<style>
  .einde {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  h1 {
    margin: 0;
    font-size: 76px;
    animation: pop-in 0.7s ease-out;
  }
  .sub {
    margin: 0;
    font-size: 28px;
    color: #dbeafe;
  }
  .groep {
    display: flex;
    align-items: end;
    gap: 30px;
  }
  .tellers {
    display: flex;
    gap: 24px;
  }
  .tellers div {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 150px;
    padding: 10px 20px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(253, 230, 138, 0.5);
  }
  .tellers strong {
    font-size: 44px;
    color: #fde68a;
  }
  .tellers span {
    font-size: 20px;
    color: #dbeafe;
  }
  .sluit {
    margin: 4px 0 0;
    font-size: 20px;
    color: #93c5fd;
  }
  .opnieuw {
    margin-top: 8px;
    padding: 12px 26px;
    border-radius: 999px;
    font-size: 20px;
    color: #dbeafe;
    background: rgba(255, 255, 255, 0.08);
    border: 2px solid rgba(255, 255, 255, 0.2);
  }
</style>
